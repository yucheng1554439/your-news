import "server-only";

import { buildFallbackIntelligence } from "@/lib/intelligence/fallback";
import { repairStoryIntelligencePackage } from "@/lib/intelligence/story-intelligence-quality";
import type { StoryIntelligencePackage } from "@/lib/intelligence/types";
import type { OnboardingProfile, Story } from "@/lib/types";

function pickText(...candidates: (string | undefined | null)[]): string {
  for (const c of candidates) {
    const t = c?.trim();
    if (t) return t;
  }
  return "";
}

/** Ensure every story intelligence section is populated before persistence or API. */
export function completeStoryIntelligencePackage(
  story: Story,
  pkg: StoryIntelligencePackage,
  profile: OnboardingProfile | null = null
): StoryIntelligencePackage {
  const fallback = buildFallbackIntelligence(
    story,
    profile,
    pkg.profileFingerprint
  );

  const merged: StoryIntelligencePackage = {
    ...pkg,
    theBriefing: pickText(pkg.theBriefing, fallback.theBriefing),
    whyItMatters: pickText(pkg.whyItMatters, fallback.whyItMatters),
    whyItMattersToYou: pickText(
      pkg.whyItMattersToYou,
      fallback.whyItMattersToYou
    ),
    nextWatch: pickText(pkg.nextWatch, fallback.nextWatch),
  };

  return repairStoryIntelligencePackage(story, merged, profile);
}
