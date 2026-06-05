import { canGeneratePersonalizedSection } from "@/lib/intelligence/profile-context";
import {
  buildMetadataBriefing,
  buildMetadataPersonalizedWhy,
  buildMetadataWhatToWatch,
  buildMetadataWhyItMatters,
} from "@/lib/intelligence/story-intelligence-quality";
import type { StoryIntelligencePackage } from "@/lib/intelligence/types";
import type { OnboardingProfile, Story } from "@/lib/types";

export function buildFallbackIntelligence(
  story: Story,
  profile: OnboardingProfile | null,
  profileFingerprint: string
): StoryIntelligencePackage {
  return {
    theBriefing: buildMetadataBriefing(story),
    whyItMatters: buildMetadataWhyItMatters(story),
    whyItMattersToYou:
      profile && canGeneratePersonalizedSection(profile)
        ? buildMetadataPersonalizedWhy(story, profile)
        : undefined,
    nextWatch: buildMetadataWhatToWatch(story),
    generatedAt: new Date().toISOString(),
    profileFingerprint,
    generatedBy: "fallback",
  };
}
