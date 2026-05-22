"use server";

import {
  resolveWeeklyBriefing,
  type WeeklyBriefingMode,
} from "@/lib/briefing/weekly-engine";
import type { OnboardingProfile, Story } from "@/lib/types";

export async function fetchWeeklyBriefing(
  stories: Story[],
  mode: WeeklyBriefingMode,
  profile: OnboardingProfile | null
) {
  return resolveWeeklyBriefing(stories, mode, profile);
}
