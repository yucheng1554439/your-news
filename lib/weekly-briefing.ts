import {
  deriveFallbackHeadline,
  deriveFallbackSummary,
} from "@/lib/briefing/format-weekly";
import { deriveKeySignal } from "@/lib/briefing/key-signal";
import {
  allStoriesFromSelection,
  selectWeeklyBriefingSelection,
} from "@/lib/briefing/weekly-selection";
import type { WeeklyBriefing, WeeklyBriefingMode } from "@/lib/briefing/weekly-engine";
import type { OnboardingProfile, Story } from "@/lib/types";

export type { WeeklyBriefing, WeeklyBriefingMode };

export function buildWeeklyBriefingSync(
  stories: Story[],
  mode: WeeklyBriefingMode,
  profile: OnboardingProfile | null
): WeeklyBriefing {
  const selection = selectWeeklyBriefingSelection(stories, mode, profile);
  const pool = allStoriesFromSelection(selection);

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return {
    mode,
    weekLabel: `${fmt(weekAgo)} – ${fmt(now)}`,
    headline: deriveFallbackHeadline(pool, mode, profile, selection),
    summary: deriveFallbackSummary(pool, mode, profile, selection),
    keySignal: deriveKeySignal(pool),
    generatedBy: "fallback",
  };
}
