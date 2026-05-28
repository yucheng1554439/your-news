"use client";

import { useCallback, useMemo, useState } from "react";
import { buildWeeklyBriefingSync } from "@/lib/weekly-briefing";
import type { WeeklyBriefingMode } from "@/lib/briefing/weekly-engine";
import type { WeeklyBriefing } from "@/lib/weekly-briefing";
import type { FeedMode } from "@/components/ToggleTabs";
import type { OnboardingProfile, Story } from "@/lib/types";

function feedModeToBriefingMode(feedMode: FeedMode): WeeklyBriefingMode {
  return feedMode === "personalized" ? "for-you" : "global";
}

export function useWeeklyBriefing(
  stories: Story[],
  profile: OnboardingProfile | null,
  briefingsFromSnapshot: Partial<Record<WeeklyBriefingMode, WeeklyBriefing>>
) {
  const [feedMode, setFeedMode] = useState<FeedMode>("personalized");
  const briefingMode = feedModeToBriefingMode(feedMode);

  const handleFeedModeChange = useCallback((mode: FeedMode) => {
    setFeedMode(mode);
  }, []);

  const heroBriefing = useMemo(() => {
    const cached = briefingsFromSnapshot[briefingMode];
    if (cached?.mode === briefingMode) return cached;

    if (!profile || stories.length === 0) {
      return {
        mode: briefingMode,
        weekLabel: "",
        headline: "",
        summary: "",
        keySignal: "",
        generatedBy: "fallback",
      } satisfies WeeklyBriefing;
    }

    return buildWeeklyBriefingSync(stories, briefingMode, profile);
  }, [briefingsFromSnapshot, briefingMode, profile, stories]);

  return {
    feedMode,
    briefingMode,
    handleFeedModeChange,
    heroBriefing,
  };
}
