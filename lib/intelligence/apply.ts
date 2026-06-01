import type { StoryIntelligencePackage } from "@/lib/intelligence/types";
import type { Story } from "@/lib/types";

export function applyIntelligenceToStory(
  story: Story,
  pkg: StoryIntelligencePackage
): Story {
  const corroboratingSlugs =
    pkg.materialSlugs?.filter((slug) => slug !== story.slug) ?? [];

  return {
    ...story,
    summary: pkg.theBriefing,
    whyItMatters: pkg.whyItMatters,
    whyItMattersToYou: pkg.whyItMattersToYou,
    nextWatch: pkg.nextWatch,
    economicImplications: pkg.strategicImplications,
    perspectives: pkg.perspectives,
    marketReaction: pkg.marketRead,
    sourceContext: pkg.sourceLens,
    intelligenceGeneratedBy: pkg.generatedBy,
    intelligenceAiError: undefined,
    intelligenceOpenaiError: undefined,
    intelligenceAnchorSlug: pkg.anchorSlug ?? story.slug,
    intelligenceAnchorHeadline: pkg.anchorHeadline ?? story.headline,
    intelligenceMaterialSlugs: pkg.materialSlugs ?? [story.slug],
    intelligenceClusterId: pkg.clusterId,
    paywallDetected: pkg.paywallSignal ?? story.paywallDetected,
    signalSummaryDisclaimer: pkg.signalSummaryDisclaimer,
    corroboratingSlugs:
      corroboratingSlugs.length > 0 ? corroboratingSlugs : story.corroboratingSlugs,
  };
}
