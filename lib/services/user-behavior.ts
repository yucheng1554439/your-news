import "server-only";

import { auth } from "@clerk/nextjs/server";
import {
  recordIntelligenceRefresh,
  type ReadingSignalsMetadata,
} from "@/lib/personalization/reading-signals-metadata";
import { loadUserIntelligenceInputs } from "@/lib/user-profile/store";
import type { SavedStoryRef } from "@/lib/saved-stories/metadata";
import type { OnboardingProfile } from "@/lib/types";
import {
  loadUserProfile,
  patchUserProfile,
} from "@/lib/user-profile/store";

export type UserBehaviorInputs = {
  savedRefs: SavedStoryRef[];
  reading: ReadingSignalsMetadata | null;
};

/** Load saved stories + reading signals for a user (KV store). */
export async function resolveUserBehaviorInputs(
  profile: OnboardingProfile | null,
  explicitUserId?: string | null
): Promise<UserBehaviorInputs> {
  if (!profile?.completed) {
    return { savedRefs: [], reading: null };
  }

  const userId = explicitUserId ?? (await auth()).userId;
  if (!userId) {
    return { savedRefs: [], reading: null };
  }

  const inputs = await loadUserIntelligenceInputs(userId);
  return {
    savedRefs: inputs.savedRefs,
    reading: inputs.reading,
  };
}

export async function recordRefreshSignalForUser(userId: string): Promise<void> {
  try {
    const record = await loadUserProfile(userId);
    await patchUserProfile(userId, {
      readingSignals: recordIntelligenceRefresh(record.readingSignals),
    });
  } catch {
    /* non-blocking */
  }
}
