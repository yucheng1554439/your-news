import "server-only";

import { resolveStoryIntelligence } from "@/lib/intelligence/engine";
import { hasPersonalizationProfile } from "@/lib/intelligence/profile-context";
import type { OnboardingProfile, Story } from "@/lib/types";

/**
 * Returns personalized "Why This Matters To You" via the unified intelligence engine.
 */
export async function getPersonalizedWhyForUser(
  story: Story,
  profile: OnboardingProfile,
): Promise<string | null> {
  if (!hasPersonalizationProfile(profile)) {
    return null;
  }

  const pkg = await resolveStoryIntelligence(story, profile);
  return pkg.whyItMattersToYou ?? null;
}
