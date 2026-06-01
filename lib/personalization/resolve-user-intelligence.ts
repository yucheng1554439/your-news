import "server-only";

import { buildUserIntelligenceProfile } from "@/lib/personalization/intelligence-profile";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import type { ReadingSignalsMetadata } from "@/lib/personalization/reading-signals-metadata";
import type { SavedStoryRef } from "@/lib/saved-stories/metadata";
import type { OnboardingProfile, Story } from "@/lib/types";

export type UserIntelligenceInput = {
  profile: OnboardingProfile;
  savedRefs: SavedStoryRef[];
  reading: ReadingSignalsMetadata;
  pool: Story[];
};

export function buildUserIntelligenceFromInput(
  input: UserIntelligenceInput
): UserIntelligenceProfile {
  return buildUserIntelligenceProfile(
    input.profile,
    input.savedRefs,
    input.reading,
    input.pool
  );
}

export function buildUserIntelligenceOrNull(
  profile: OnboardingProfile | null,
  savedRefs: SavedStoryRef[],
  reading: ReadingSignalsMetadata,
  pool: Story[]
): UserIntelligenceProfile | null {
  if (!profile?.completed) return null;
  return buildUserIntelligenceProfile(profile, savedRefs, reading, pool);
}
