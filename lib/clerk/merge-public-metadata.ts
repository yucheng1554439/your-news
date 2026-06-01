import type { OnboardingProfile } from "@/lib/types";
import { ONBOARDING_METADATA_KEY } from "@/lib/onboarding-metadata";
import {
  SAVED_STORIES_METADATA_KEY,
  type SavedStoriesMetadata,
} from "@/lib/saved-stories/metadata";
import {
  READING_SIGNALS_METADATA_KEY,
  type ReadingSignalsMetadata,
} from "@/lib/personalization/reading-signals-metadata";

export function mergePublicMetadata(
  existing: Record<string, unknown> | undefined,
  patch: {
    onboarding?: OnboardingProfile;
    savedStories?: SavedStoriesMetadata;
    readingSignals?: ReadingSignalsMetadata;
  }
): Record<string, unknown> {
  const base = { ...(existing ?? {}) };

  if (patch.onboarding) {
    base[ONBOARDING_METADATA_KEY] = patch.onboarding;
  }
  if (patch.savedStories) {
    base[SAVED_STORIES_METADATA_KEY] = patch.savedStories;
  }
  if (patch.readingSignals) {
    base[READING_SIGNALS_METADATA_KEY] = patch.readingSignals;
  }

  return base;
}
