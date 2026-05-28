import type { NarrativeTheme } from "@/lib/editorial/narrative-clusters";
import { selectGlobalWeeklyNarrative } from "@/lib/briefing/narrative-synthesis";
import { selectPersonalizedWeeklyThreads } from "@/lib/briefing/personalized-weekly";
import type { WeeklyBriefingMode } from "@/lib/briefing/weekly-engine";
import type { OnboardingProfile, Story } from "@/lib/types";

export type NarrativeThread = {
  clusterId: string;
  theme: NarrativeTheme;
  label: string;
  /** Reader-specific relevance 0–10 */
  personalScore: number;
  stories: Story[];
};

export type WeeklyBriefingSelection = {
  mode: WeeklyBriefingMode;
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

/**
 * Global → one dominant world narrative.
 * For You → multiple reader-relevant narratives synthesized together.
 */
export function selectWeeklyBriefingSelection(
  stories: Story[],
  mode: WeeklyBriefingMode,
  profile: OnboardingProfile | null
): WeeklyBriefingSelection {
  if (mode === "global") {
    const global = selectGlobalWeeklyNarrative(stories, profile);
    return {
      mode: "global",
      cacheKeyId: global.clusterId,
      threads: [
        {
          clusterId: global.clusterId,
          theme: global.theme,
          label: global.narrativeLabel,
          personalScore: 0,
          stories: global.stories,
        },
      ],
    };
  }

  return selectPersonalizedWeeklyThreads(stories, profile);
}
