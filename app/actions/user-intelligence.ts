"use server";

import { auth } from "@clerk/nextjs/server";
import { getOnboardingFromClerk } from "@/app/actions/onboarding";
import { getReadingSignalsFromClerk } from "@/app/actions/reading-signals";
import { getSavedStoriesFromClerk } from "@/app/actions/saved-stories";
import { buildUserIntelligenceOrNull } from "@/lib/personalization/resolve-user-intelligence";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import { getStoryPool } from "@/lib/news/story-pool";

export async function getUserIntelligenceProfileAction(): Promise<UserIntelligenceProfile | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const profile = await getOnboardingFromClerk();
  if (!profile?.completed) return null;

  const [savedRefs, reading, pool] = await Promise.all([
    getSavedStoriesFromClerk(),
    getReadingSignalsFromClerk(),
    getStoryPool(),
  ]);

  return buildUserIntelligenceOrNull(
    profile,
    savedRefs,
    reading,
    pool.stories
  );
}
