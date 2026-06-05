import type { StoryIntelligencePackage } from "@/lib/intelligence/types";
import { completeStoryIntelligencePackage } from "@/lib/intelligence/complete-package";
import type { OnboardingProfile, Story } from "@/lib/types";

export function applyIntelligenceToStory(
  story: Story,
  pkg: StoryIntelligencePackage,
  profile: OnboardingProfile | null = null
): Story {
  const complete = completeStoryIntelligencePackage(story, pkg, profile);
  const corroboratingSlugs =
    complete.materialSlugs?.filter((slug) => slug !== story.slug) ?? [];

  return {
    ...story,
    summary: complete.theBriefing,
    whyItMatters: complete.whyItMatters,
    whyItMattersToYou: complete.whyItMattersToYou,
    nextWatch: complete.nextWatch,
    economicImplications: complete.strategicImplications,
    perspectives: complete.perspectives,
    marketReaction: complete.marketRead,
    sourceContext: complete.sourceLens,
    intelligenceGeneratedBy: complete.generatedBy,
    intelligenceAiError: undefined,
    intelligenceOpenaiError: undefined,
    intelligenceAnchorSlug: complete.anchorSlug ?? story.slug,
    intelligenceAnchorHeadline: complete.anchorHeadline ?? story.headline,
    intelligenceMaterialSlugs: complete.materialSlugs ?? [story.slug],
    intelligenceClusterId: complete.clusterId,
    paywallDetected: complete.paywallSignal ?? story.paywallDetected,
    signalSummaryDisclaimer: complete.signalSummaryDisclaimer,
    corroboratingSlugs:
      corroboratingSlugs.length > 0 ? corroboratingSlugs : story.corroboratingSlugs,
  };
}
