import "server-only";

import { serializeProfileIntelligence } from "@/lib/api/serialize-profile-intelligence";
import { buildUserIntelligenceOrNull } from "@/lib/personalization/resolve-user-intelligence";
import { getStoryPool } from "@/lib/news/story-pool";
import {
  getReadingSignalsForUser,
  getSavedStoryRefsForUser,
  getTopicPreferencesForUser,
} from "@/lib/user-profile/store";
import { getOnboardingForUser } from "@/lib/services/onboarding";

export async function getProfileIntelligenceForUserId(userId: string) {
  const profile = await getOnboardingForUser(userId);
  if (!profile?.completed) return null;

  const [savedRefs, reading, pool, topicPreferences] = await Promise.all([
    getSavedStoryRefsForUser(userId),
    getReadingSignalsForUser(userId),
    getStoryPool(),
    getTopicPreferencesForUser(userId),
  ]);

  const uip = buildUserIntelligenceOrNull(
    profile,
    savedRefs,
    reading,
    pool.stories
  );

  return serializeProfileIntelligence(
    profile,
    uip,
    savedRefs,
    reading,
    topicPreferences
  );
}
