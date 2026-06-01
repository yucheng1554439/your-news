"use server";

import {
  resolveBriefing,
  type BriefingCadence,
  type BriefingMode,
} from "@/lib/briefing/weekly-engine";
import type { OnboardingProfile, Story } from "@/lib/types";

export async function fetchBriefing(
  stories: Story[],
  mode: BriefingMode,
  profile: OnboardingProfile | null,
  cadence: BriefingCadence = "weekly"
) {
  return resolveBriefing(stories, mode, profile, { cadence });
}

/** @deprecated Use fetchBriefing */
export const fetchWeeklyBriefing = fetchBriefing;
