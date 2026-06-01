import "server-only";

import { buildUserIntelligenceProfile } from "@/lib/personalization/intelligence-profile";
import { mergeTopicPreferencesIntoIntelligence } from "@/lib/personalization/topic-preferences";
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
  return mergeTopicPreferencesIntoIntelligence(
    input.profile,
    buildUserIntelligenceProfile(
      input.profile,
      input.savedRefs,
      input.reading,
      input.pool
    )
  );
}

export function buildUserIntelligenceOrNull(
  profile: OnboardingProfile | null,
  savedRefs: SavedStoryRef[],
  reading: ReadingSignalsMetadata,
  pool: Story[]
): UserIntelligenceProfile | null {
  if (!profile?.completed) return null;
  return mergeTopicPreferencesIntoIntelligence(
    profile,
    buildUserIntelligenceProfile(profile, savedRefs, reading, pool)
  );
}
