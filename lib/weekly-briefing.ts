import { deriveKeySignal } from "@/lib/briefing/key-signal";
import type { WeeklyBriefing, WeeklyBriefingMode } from "@/lib/briefing/weekly-engine";
import type { OnboardingProfile, Story } from "@/lib/types";
import { computeUserRelevanceScore } from "@/lib/personalization/engine";
import { rankStoriesGlobal } from "@/lib/personalization/engine";

export type { WeeklyBriefing, WeeklyBriefingMode };

/** Client-side fallback when server briefing is loading. */
export function buildWeeklyBriefingSync(
  stories: Story[],
  mode: WeeklyBriefingMode,
  profile: OnboardingProfile | null
): WeeklyBriefing {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - weekMs;
  const recent = stories.filter(
    (s) => new Date(s.publishedAt).getTime() >= cutoff
  );
  const pool = recent.length >= 3 ? recent : stories;

  const selected =
    mode === "global"
      ? rankStoriesGlobal(pool).slice(0, 6)
      : profile
        ? [...pool]
            .sort(
              (a, b) =>
                computeUserRelevanceScore(b, profile) -
                computeUserRelevanceScore(a, profile)
            )
            .slice(0, 6)
        : pool.slice(0, 6);

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const headline =
    mode === "for-you"
      ? "Your personalized weekly intelligence."
      : "Global weekly intelligence briefing.";

  const summary =
    mode === "for-you" && profile
      ? `The desk prioritized ${selected.length} stories aligned with your ${profile.career ?? "profile"} and ${profile.interests.join(", ") || "interests"}.`
      : `The desk prioritized ${selected.length} globally significant stories by editorial weight and recency.`;

  return {
    mode,
    weekLabel: `${fmt(weekAgo)} – ${fmt(now)}`,
    headline,
    summary,
    keySignal: deriveKeySignal(selected),
  };
}
