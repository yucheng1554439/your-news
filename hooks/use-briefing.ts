"use client";

import { useCallback, useMemo, useState } from "react";
import { buildWeeklyBriefingSync } from "@/lib/weekly-briefing";
import type {
  BriefingCadence,
  BriefingMode,
  CadenceBriefings,
  IntelligenceBriefing,
} from "@/lib/briefing/types";
import { normalizeBriefing } from "@/lib/briefing/types";
import type { FeedMode } from "@/components/ToggleTabs";
import type { OnboardingProfile, Story } from "@/lib/types";

function feedModeToBriefingMode(feedMode: FeedMode): BriefingMode {
  return feedMode === "personalized" ? "for-you" : "global";
}

export function useBriefing(
  stories: Story[],
  profile: OnboardingProfile | null,
  briefingsFromSnapshot: CadenceBriefings
) {
  const [feedMode, setFeedMode] = useState<FeedMode>("personalized");
  const [cadence, setCadence] = useState<BriefingCadence>("weekly");
  const briefingMode = feedModeToBriefingMode(feedMode);

  const handleFeedModeChange = useCallback((mode: FeedMode) => {
    setFeedMode(mode);
  }, []);

  const handleCadenceChange = useCallback((next: BriefingCadence) => {
    setCadence(next);
  }, []);

  const heroBriefing = useMemo(() => {
    const cached = briefingsFromSnapshot[cadence]?.[briefingMode];
    if (cached?.mode === briefingMode && cached.cadence === cadence) {
      return normalizeBriefing(cached);
    }

    if (!profile || stories.length === 0) {
      return {
        cadence,
        mode: briefingMode,
        periodLabel: "",
        weekLabel: "",
        headline: "",
        summary: "",
        keySignal: "",
        provenance: {
          articleCount: 0,
          narrativeCount: 0,
          sourceCount: 0,
          sources: [],
        },
        generatedBy: "fallback",
      } satisfies IntelligenceBriefing;
    }

    return buildWeeklyBriefingSync(stories, briefingMode, profile, cadence);
  }, [briefingsFromSnapshot, briefingMode, cadence, profile, stories]);

  return {
    feedMode,
    cadence,
    briefingMode,
    handleFeedModeChange,
    handleCadenceChange,
    heroBriefing,
  };
}

/** @deprecated Use useBriefing */
export const useWeeklyBriefing = useBriefing;
