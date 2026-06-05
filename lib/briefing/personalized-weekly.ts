import "server-only";

import { detectNarrativeTheme, type NarrativeTheme } from "@/lib/editorial/narrative-clusters";
import { THEME_LABELS } from "@/lib/briefing/narrative-synthesis";
import { logWeeklySelection } from "@/lib/briefing/weekly-pipeline-log";
import {
  buildWeeklyIntelligenceMap,
  type WeeklyIntelligenceMap,
} from "@/lib/briefing/weekly-intelligence-map";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import type { BriefingCadence } from "@/lib/briefing/types";
import type {
  WeeklyBriefingSelection,
  NarrativeThread,
} from "@/lib/briefing/weekly-selection";
import type { OnboardingProfile, Story } from "@/lib/types";

const THREAD_LIMITS: Record<
  BriefingCadence,
  { max: number; min: number }
> = {
  daily: { max: 999, min: 1 },
  weekly: { max: 999, min: 1 },
};

function buildCacheKeyId(threads: NarrativeThread[]): string {
  const ids = threads
    .map((t) => t.clusterId)
    .sort()
    .join("+");
  return `landscape:${ids.slice(0, 120)}`;
}

function mapToThreads(
  map: WeeklyIntelligenceMap,
  limits: { max: number; min: number }
): NarrativeThread[] {
  const entries = map.entries.slice(0, limits.max);

  return entries.map((entry) => ({
    clusterId: entry.cluster.id,
    theme: entry.cluster.theme,
    label: entry.intelligence.title,
    personalScore: Math.round(entry.personalScore * 10) / 10,
    cluster: entry.intelligence,
    stories: entry.stories,
  }));
}

function fallbackSelection(
  corpus: Story[],
  cadence: BriefingCadence
): WeeklyBriefingSelection {
  const theme = corpus[0]
    ? detectNarrativeTheme(corpus[0])
    : ("general" as NarrativeTheme);

  return {
    cadence,
    mode: "for-you",
    lens: "pattern",
    cacheKeyId: `${cadence}:landscape:fallback`,
    threads: [
      {
        clusterId: "fallback",
        theme,
        label: THEME_LABELS[theme],
        personalScore: 0,
        stories: corpus.slice(0, 40),
      },
    ],
  };
}

/**
 * For You weekly: full corpus → narrative map → relevance-ranked clusters → synthesis.
 * The AI sees the same information landscape as Global; personalization is interpretation.
 */
export function selectPersonalizedWeeklyThreads(
  corpus: Story[],
  profile: OnboardingProfile | null,
  cadence: BriefingCadence = "weekly",
  intelligence?: UserIntelligenceProfile | null
): WeeklyBriefingSelection {
  const limits = THREAD_LIMITS[cadence];

  const map = buildWeeklyIntelligenceMap(
    corpus,
    profile,
    "for-you",
    intelligence
  );

  logWeeklySelection({
    mode: "for-you",
    cadence: cadence === "daily" ? "daily" : "weekly",
    candidateCount: map.corpusSize,
    poolAfterRank: map.corpusSize,
    threadCount: map.clusterCount,
    storyCount: map.totalStoryCount,
  });

  if (map.entries.length === 0) {
    return fallbackSelection(corpus, cadence);
  }

  const threads = mapToThreads(map, limits);

  if (threads.length === 0) {
    return fallbackSelection(corpus, cadence);
  }

  return {
    cadence,
    mode: "for-you",
    lens: "pattern",
    cacheKeyId: `${cadence}:${buildCacheKeyId(threads)}`,
    threads,
  };
}

/** Expose map builder for prompts and logging. */
export { buildWeeklyIntelligenceMap };
