import type { NarrativeTheme } from "@/lib/editorial/narrative-clusters";
import type { ClusterIntelligence } from "@/lib/types";
import { selectDailyEventBriefing } from "@/lib/briefing/daily-selection";
import {
  selectWeeklyPatternBriefing,
  type DailyExclusion,
} from "@/lib/briefing/weekly-pattern-selection";
import { logWeeklySelectionFromResult } from "@/lib/briefing/weekly-pipeline-log";
import {
  ensureBriefingSelectionMaterial,
  stripBriefingDiagnostics,
} from "@/lib/briefing/weekly-rescue";
import type { UserIntelligenceProfile } from "@/lib/personalization/intelligence-profile";
import type { BriefingCadence, BriefingMode } from "@/lib/briefing/types";
import type { OnboardingProfile, Story } from "@/lib/types";

export type { DailyExclusion } from "@/lib/briefing/weekly-pattern-selection";

export type NarrativeThread = {
  clusterId: string;
  theme: NarrativeTheme;
  label: string;
  /** Reader-specific relevance 0–10 */
  personalScore: number;
  stories: Story[];
  /** Full event object for synthesis (all supporting articles). */
  cluster?: ClusterIntelligence;
};

export type BriefingLens = "event" | "pattern";

export type WeeklyBriefingSelection = {
  cadence: BriefingCadence;
  mode: BriefingMode;
  lens: BriefingLens;
  /** Stable id for cache keys */
  cacheKeyId: string;
  threads: NarrativeThread[];
};

export function allStoriesFromSelection(
  selection: WeeklyBriefingSelection
): Story[] {
  const seen = new Set<string>();
  const out: Story[] = [];
  for (const thread of selection.threads) {
    for (const story of thread.stories) {
      if (seen.has(story.slug)) continue;
      seen.add(story.slug);
      out.push(story);
    }
  }
  return out;
}

export type BriefingSelectionOptions = {
  intelligence?: UserIntelligenceProfile | null;
  /** Exclude daily event material so weekly rises to pattern level */
  dailyExclusion?: DailyExclusion;
  /** Full editorial pool for cluster synthesis (global uses largest set). */
  corpus?: Story[];
};

export function buildDailyExclusion(
  dailySelections: WeeklyBriefingSelection[]
): DailyExclusion {
  const themes = new Set<NarrativeTheme>();
  const slugs = new Set<string>();
  for (const sel of dailySelections) {
    for (const thread of sel.threads) {
      themes.add(thread.theme);
      for (const story of thread.stories) {
        slugs.add(story.slug);
      }
    }
  }
  return { themes: [...themes], slugs: [...slugs] };
}

/**
 * Daily → single EVENT (24h). Weekly → strategic PATTERN (clusters, higher abstraction).
 */
export function selectWeeklyBriefingSelection(
  stories: Story[],
  mode: BriefingMode,
  profile: OnboardingProfile | null,
  cadence: BriefingCadence = "weekly",
  options?: BriefingSelectionOptions
): WeeklyBriefingSelection {
  const intelligence = options?.intelligence ?? null;
  const rescueCorpus = options?.corpus ?? stories;

  let selection: WeeklyBriefingSelection;

  if (cadence === "daily") {
    selection = selectDailyEventBriefing(stories, mode, profile, intelligence);
  } else {
    const weeklyCorpus =
      options?.corpus && options.corpus.length > 0 ? options.corpus : stories;
    selection = selectWeeklyPatternBriefing(
      weeklyCorpus,
      mode,
      profile,
      options?.dailyExclusion,
      intelligence
    );
  }

  const perThread = cadence === "daily" ? 1 : 40;
  const { selection: ensured, rescueApplied } = ensureBriefingSelectionMaterial(
    selection,
    rescueCorpus,
    mode,
    profile,
    perThread
  );

  logWeeklySelectionFromResult(
    ensured,
    cadence === "weekly" ? (options?.corpus?.length ?? stories.length) : stories.length,
    rescueApplied
  );

  return ensured;
}

export { stripBriefingDiagnostics, ensureBriefingSelectionMaterial };
