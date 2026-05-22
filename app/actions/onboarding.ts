"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  ONBOARDING_METADATA_KEY,
  parseOnboardingFromMetadata,
} from "@/lib/onboarding-metadata";
import type { OnboardingProfile } from "@/lib/types";

export async function getOnboardingFromClerk(): Promise<OnboardingProfile | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return parseOnboardingFromMetadata(
    user.publicMetadata as Record<string, unknown>
  );
}

export async function saveOnboardingToClerk(
  profile: OnboardingProfile
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Not authenticated" };
  }

  const stamped: OnboardingProfile = {
    ...profile,
    updatedAt: profile.updatedAt ?? Date.now(),
  };

  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        [ONBOARDING_METADATA_KEY]: stamped,
      },
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to save preferences" };
  }
}
