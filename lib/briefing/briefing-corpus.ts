import "server-only";

import { filterStoriesForCadence } from "@/lib/briefing/cadence";
import {
  detectNarrativeTheme,
  type NarrativeTheme,
} from "@/lib/editorial/narrative-clusters";
import {
  rankStoriesForUser,
  rankStoriesGlobal,
} from "@/lib/personalization/engine";
import {
  SIGNAL_DEFINITIONS,
  storyMatchesSignal,
} from "@/lib/signals/catalog";
import type { BriefingCadence, BriefingMode } from "@/lib/briefing/types";
import type {
  WeeklyBriefingSelection,
  NarrativeThread,
} from "@/lib/briefing/weekly-selection";
import { allStoriesFromSelection } from "@/lib/briefing/weekly-selection";
import type { OnboardingProfile, Story } from "@/lib/types";

/** Minimum unique articles passed to synthesis (when corpus allows). */
export const BRIEFING_CORPUS_MIN: Record<BriefingCadence, number> = {
  daily: 20,
  weekly: 50,
};

const MS_PER_HOUR = 60 * 60 * 1000;

function hoursSince(publishedAt: string): number {
  const t = Date.parse(publishedAt);
  if (!Number.isFinite(t)) return 999;
  return (Date.now() - t) / MS_PER_HOUR;
}

/** Daily pool: prefer last 24h, expand to 48h window when thin. */
export function dailyBriefingCorpus(corpus: Story[]): Story[] {
  const in24h = corpus.filter((s) => hoursSince(s.publishedAt) <= 24);
  if (in24h.length >= BRIEFING_CORPUS_MIN.daily) return in24h;

  const in48h = filterStoriesForCadence(corpus, "daily");
  if (in48h.length > 0) {
    if (in24h.length > 0 && in48h.length > in24h.length) {
      console.warn(
        `[BRIEFING_CORPUS] daily pool expanded 24h→48h (${in24h.length}→${in48h.length} stories)`
      );
    }
    return in48h;
  }

  return [...corpus].sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
  );
}

/** Weekly pool: last 7 days. */
export function weeklyBriefingCorpus(corpus: Story[]): Story[] {
  return filterStoriesForCadence(corpus, "weekly");
}

export function briefingCorpusForCadence(
  corpus: Story[],
  cadence: BriefingCadence
): Story[] {
  return cadence === "daily"
    ? dailyBriefingCorpus(corpus)
    : weeklyBriefingCorpus(corpus);
}

export function countSignalsInStories(stories: Story[]): number {
  let count = 0;
  for (const def of SIGNAL_DEFINITIONS) {
    if (stories.some((s) => storyMatchesSignal(s, def))) {
      count += 1;
    }
  }
  return count;
}

export type BriefingCorpusAudit = {
  cadence: BriefingCadence;
  mode: BriefingMode;
  storiesProcessed: number;
  sourcesProcessed: number;
  narrativesProcessed: number;
  signalsProcessed: number;
  corpusPoolSize: number;
  clusterIds: string[];
  clusterCount: number;
};

export function auditBriefingCorpusInput(
  selection: WeeklyBriefingSelection,
  stories: Story[],
  corpusPoolSize: number
): BriefingCorpusAudit {
  const sources = new Set(
    stories.map((s) => (s.source || "Unknown").trim()).filter(Boolean)
  );
  const clusterIds = selection.threads.map((t) => t.clusterId);
  const audit: BriefingCorpusAudit = {
    cadence: selection.cadence,
    mode: selection.mode,
    storiesProcessed: stories.length,
    sourcesProcessed: sources.size,
    narrativesProcessed: selection.threads.length,
    signalsProcessed: countSignalsInStories(stories),
    corpusPoolSize,
    clusterIds,
    clusterCount: clusterIds.length,
  };

  console.log(
    `[BRIEFING_CORPUS] ${audit.cadence}/${audit.mode} — storiesProcessed=${audit.storiesProcessed} sourcesProcessed=${audit.sourcesProcessed} narrativesProcessed=${audit.narrativesProcessed} signalsProcessed=${audit.signalsProcessed} corpusPool=${audit.corpusPoolSize} clusterCount=${audit.clusterCount}`
  );

  console.log(
    `[BRIEFING_VERIFY] generation ${audit.cadence}/${audit.mode}`,
    JSON.stringify({
      phase: "generation",
      storiesProcessed: audit.storiesProcessed,
      sourcesProcessed: audit.sourcesProcessed,
      narrativesProcessed: audit.narrativesProcessed,
      signalsProcessed: audit.signalsProcessed,
      corpusPool: audit.corpusPoolSize,
      clusterCount: audit.clusterCount,
      clustersIncluded: audit.clusterCount,
      personalizedClustersIncluded:
        selection.mode === "for-you"
          ? selection.threads.filter((t) => t.personalScore >= 5).length
          : audit.clusterCount,
      clusterIds: audit.clusterIds.slice(0, 12),
    })
  );

  if (
    audit.narrativesProcessed <= 1 &&
    audit.storiesProcessed >= 20 &&
    audit.corpusPoolSize >= 20
  ) {
    console.warn(
      "[BRIEFING_CLUSTER_WARNING]",
      JSON.stringify({
        cadence: audit.cadence,
        mode: audit.mode,
        storiesProcessed: audit.storiesProcessed,
        sourcesProcessed: audit.sourcesProcessed,
        narrativesProcessed: audit.narrativesProcessed,
        signalsProcessed: audit.signalsProcessed,
        corpusPool: audit.corpusPoolSize,
        clusterIds: audit.clusterIds,
        reason: "stories_gt_20_narratives_lte_1",
      })
    );
  }

  if (
    audit.narrativesProcessed <= 1 &&
    audit.storiesProcessed >= 20 &&
    audit.corpusPoolSize >= 20
  ) {
    console.warn(
      `[BRIEFING_VERIFY] ${audit.cadence}/${audit.mode} — single narrative thread with ${audit.storiesProcessed} stories (clusters: ${audit.clusterIds.join(", ")})`
    );
  }

  if (
    audit.storiesProcessed < BRIEFING_CORPUS_MIN[selection.cadence] &&
    audit.corpusPoolSize >= BRIEFING_CORPUS_MIN[selection.cadence]
  ) {
    console.warn(
      `[BRIEFING_CORPUS] ${selection.cadence}/${selection.mode} synthesis below target (${audit.storiesProcessed} < ${BRIEFING_CORPUS_MIN[selection.cadence]}) — check cluster coverage`
    );
  }

  if (audit.storiesProcessed === 1 && audit.corpusPoolSize > 1) {
    console.error(
      `[BRIEFING_CORPUS] REGRESSION ${selection.cadence}/${selection.mode} — only 1 article in synthesis despite corpus=${audit.corpusPoolSize}`
    );
  }

  return audit;
}

function rankCorpusStories(
  corpus: Story[],
  mode: BriefingMode,
  profile: OnboardingProfile | null
): Story[] {
  if (mode === "for-you" && profile?.completed) {
    return rankStoriesForUser(corpus, profile);
  }
  return rankStoriesGlobal(corpus);
}

/**
 * When clustering yields fewer articles than the cadence minimum, attach
 * ranked corpus stories not yet in the selection.
 */
export function expandSelectionToCorpusMinimum(
  selection: WeeklyBriefingSelection,
  corpusPool: Story[],
  mode: BriefingMode,
  profile: OnboardingProfile | null
): WeeklyBriefingSelection {
  const min = BRIEFING_CORPUS_MIN[selection.cadence];
  const existing = allStoriesFromSelection(selection);
  const seen = new Set(existing.map((s) => s.slug));

  if (existing.length >= min || corpusPool.length <= existing.length) {
    return selection;
  }

  const ranked = rankCorpusStories(corpusPool, mode, profile);
  const additions = ranked.filter((s) => !seen.has(s.slug));
  const need = Math.min(min - existing.length, additions.length);
  if (need <= 0) return selection;

  const extraStories = additions.slice(0, need);
  const theme: NarrativeTheme = extraStories[0]
    ? detectNarrativeTheme(extraStories[0])
    : "general";
  const coverageThread: NarrativeThread = {
    clusterId: `${selection.cadence}:corpus-coverage`,
    theme,
    label: "Additional desk coverage",
    personalScore: 0,
    stories: extraStories,
  };

  console.warn(
    `[BRIEFING_CORPUS] ${selection.cadence}/${selection.mode} expanded synthesis +${extraStories.length} articles (${existing.length}→${existing.length + extraStories.length})`
  );

  return {
    ...selection,
    threads: [...selection.threads, coverageThread],
  };
}
