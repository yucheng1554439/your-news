import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { parseOnboardingFromMetadata } from "@/lib/onboarding-metadata";
import { getTopicPreferencesForUser } from "@/lib/user-profile/store";
import type { OnboardingProfile } from "@/lib/types";

/** Identity from Clerk + topic preferences from KV — keyed by userId. */
export async function getOnboardingForUser(
  userId: string
): Promise<OnboardingProfile | null> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const clerkProfile = parseOnboardingFromMetadata(
    user.publicMetadata as Record<string, unknown>
  );
  if (!clerkProfile) return null;

  const topicPreferences = await getTopicPreferencesForUser(userId);
  return { ...clerkProfile, topicPreferences };
}
