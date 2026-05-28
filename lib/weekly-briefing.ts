import {
  deriveFallbackHeadline,
  deriveFallbackSummary,
} from "@/lib/briefing/format-weekly";
import { deriveKeySignal } from "@/lib/briefing/key-signal";
import { selectWeeklyStrategicPool } from "@/lib/editorial/weekly-narrative";
import type { WeeklyBriefing, WeeklyBriefingMode } from "@/lib/briefing/weekly-engine";
import type { OnboardingProfile, Story } from "@/lib/types";
import {
  rankStoriesForUser,
  rankStoriesGlobal,
} from "@/lib/personalization/engine";

export type { WeeklyBriefing, WeeklyBriefingMode };

export function buildWeeklyBriefingSync(
  stories: Story[],
  mode: WeeklyBriefingMode,
  profile: OnboardingProfile | null
): WeeklyBriefing {
  const pool =
    mode === "global"
      ? selectWeeklyStrategicPool(rankStoriesGlobal(stories), 8, profile)
      : profile
        ? selectWeeklyStrategicPool(rankStoriesForUser(stories, profile), 8, profile)
        : selectWeeklyStrategicPool(rankStoriesGlobal(stories), 8, profile);

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return {
    mode,
    weekLabel: `${fmt(weekAgo)} – ${fmt(now)}`,
    headline: deriveFallbackHeadline(pool, mode, profile),
    summary: deriveFallbackSummary(pool, mode, profile),
    keySignal: deriveKeySignal(pool),
    generatedBy: "fallback",
  };
}
