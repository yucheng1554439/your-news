import "server-only";

import type { NarrativeTheme } from "@/lib/editorial/narrative-clusters";
import type { ClusterIntelligence } from "@/lib/types";
import {
  selectWeeklyPatternBriefing,
  type DailyExclusion,
} from "@/lib/briefing/weekly-pattern-selection";
import { BRIEFING_CORPUS_MIN } from "@/lib/briefing/briefing-corpus";
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
 * Daily and weekly → full LANDSCAPE (cadence corpus → all clusters → synthesis).
 * For You sees the same corpus as Global; personalization is interpretation only.
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

  const weeklyCorpus =
    options?.corpus && options.corpus.length > 0 ? options.corpus : stories;

  const selection = selectWeeklyPatternBriefing(
    weeklyCorpus,
    mode,
    profile,
    cadence,
    options?.dailyExclusion,
    intelligence
  );

  const rescueMin = BRIEFING_CORPUS_MIN[cadence];
  const { selection: ensured, rescueApplied } = ensureBriefingSelectionMaterial(
    selection,
    rescueCorpus,
    mode,
    profile,
    rescueMin
  );

  logWeeklySelectionFromResult(
    ensured,
    options?.corpus?.length ?? stories.length,
    rescueApplied
  );

  return ensured;
}

export { stripBriefingDiagnostics, ensureBriefingSelectionMaterial };
