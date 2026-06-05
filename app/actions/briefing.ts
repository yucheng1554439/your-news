"use server";

import { auth } from "@clerk/nextjs/server";
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
  cadence: BriefingCadence = "daily"
) {
  const { userId } = await auth();
  return resolveBriefing(stories, mode, profile, {
    cadence,
    userId: mode === "for-you" ? (userId ?? undefined) : undefined,
  });
}

/** @deprecated Use fetchBriefing */
export const fetchWeeklyBriefing = fetchBriefing;
