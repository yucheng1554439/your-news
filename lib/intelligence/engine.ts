import "server-only";

import { applyIntelligenceToStory } from "@/lib/intelligence/apply";
import {
  contentFingerprint,
  readIntelligenceCache,
  writeIntelligenceCache,
} from "@/lib/intelligence/cache";
import { generateCoreIntelligenceOpenAI } from "@/lib/intelligence/core-openai";
import { buildFallbackIntelligence } from "@/lib/intelligence/fallback";
import { isOpenAIConfigured } from "@/lib/intelligence/openai";
import { generatePersonalizedIntelligenceOpenAI } from "@/lib/intelligence/personalized-openai";
import {
  hashProfile,
  hasPersonalizationProfile,
} from "@/lib/intelligence/profile-context";
import type { StoryIntelligencePackage } from "@/lib/intelligence/types";
import type { OnboardingProfile, Story } from "@/lib/types";

export type { StoryIntelligencePackage } from "@/lib/intelligence/types";

export async function resolveStoryIntelligence(
  story: Story,
  profile: OnboardingProfile | null = null
): Promise<StoryIntelligencePackage> {
  const profileHash = hashProfile(
    profile && hasPersonalizationProfile(profile) ? profile : null
  );
  const fingerprint = contentFingerprint(
    story.headline,
    story.publishedAt,
    story.rawExcerpt
  );

  const cached = await readIntelligenceCache(
    story.slug,
    profileHash,
    fingerprint
  );
  if (cached) return cached;

  let pkg: StoryIntelligencePackage;

  if (isOpenAIConfigured()) {
    const coreResult = await generateCoreIntelligenceOpenAI(story, profileHash);

    if (coreResult.ok) {
      pkg = { ...coreResult.core, profileFingerprint: profileHash };

      if (profile && hasPersonalizationProfile(profile)) {
        const personalized = await generatePersonalizedIntelligenceOpenAI(
          story,
          profile,
          pkg.theBriefing,
          pkg.whyItMatters
        );
        if (personalized.ok) {
          pkg.whyItMattersToYou = personalized.text;
        } else {
          const fallback = buildFallbackIntelligence(story, profile, profileHash);
          pkg.whyItMattersToYou = fallback.whyItMattersToYou;
        }
      }
    } else {
      pkg = buildFallbackIntelligence(story, profile, profileHash);
    }
  } else {
    pkg = buildFallbackIntelligence(story, profile, profileHash);
  }

  await writeIntelligenceCache(story.slug, profileHash, fingerprint, pkg);
  return pkg;
}

export async function enrichStoryWithIntelligence(
  story: Story,
  profile: OnboardingProfile | null = null
): Promise<Story> {
  const pkg = await resolveStoryIntelligence(story, profile);
  return applyIntelligenceToStory(story, pkg);
}
