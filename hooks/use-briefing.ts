"use client";

import { useCallback, useMemo, useState } from "react";
import { emptyBriefing } from "@/lib/briefing/shared/empty-briefing";
import { normalizeBriefing } from "@/lib/briefing/shared/normalize";
import type {
  BriefingBundle,
  BriefingMode,
  IntelligenceBriefing,
} from "@/lib/briefing/types";
import type { FeedMode } from "@/components/ToggleTabs";
import type { OnboardingProfile, Story } from "@/lib/types";

function feedModeToBriefingMode(feedMode: FeedMode): BriefingMode {
  return feedMode === "personalized" ? "for-you" : "global";
}

export function useBriefing(
  stories: Story[],
  profile: OnboardingProfile | null,
  briefingsFromSnapshot: BriefingBundle
) {
  const [feedMode, setFeedMode] = useState<FeedMode>("personalized");
  const briefingMode = feedModeToBriefingMode(feedMode);

  const handleFeedModeChange = useCallback((mode: FeedMode) => {
    setFeedMode(mode);
  }, []);

  const heroBriefing = useMemo((): IntelligenceBriefing => {
    const cached = briefingsFromSnapshot[briefingMode];
    if (cached?.mode === briefingMode) {
      return normalizeBriefing(cached);
    }

    if (!profile || stories.length === 0) {
      return emptyBriefing(briefingMode);
    }

    return emptyBriefing(briefingMode);
  }, [briefingsFromSnapshot, briefingMode, profile, stories]);

  return {
    feedMode,
    briefingMode,
    handleFeedModeChange,
    heroBriefing,
  };
}

/** @deprecated Use useBriefing */
export const useWeeklyBriefing = useBriefing;
