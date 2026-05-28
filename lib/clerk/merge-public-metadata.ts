import type { OnboardingProfile } from "@/lib/types";
import { ONBOARDING_METADATA_KEY } from "@/lib/onboarding-metadata";
import {
  SAVED_STORIES_METADATA_KEY,
  type SavedStoriesMetadata,
} from "@/lib/saved-stories/metadata";

export function mergePublicMetadata(
  existing: Record<string, unknown> | undefined,
  patch: {
    onboarding?: OnboardingProfile;
    savedStories?: SavedStoriesMetadata;
  }
): Record<string, unknown> {
  const base = { ...(existing ?? {}) };

  if (patch.onboarding) {
    base[ONBOARDING_METADATA_KEY] = patch.onboarding;
  }
  if (patch.savedStories) {
    base[SAVED_STORIES_METADATA_KEY] = patch.savedStories;
  }

  return base;
}
