import type { StoryIntelligencePackage } from "@/lib/intelligence/types";
import type { Story } from "@/lib/types";

export function applyIntelligenceToStory(
  story: Story,
  pkg: StoryIntelligencePackage
): Story {
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
    intelligenceAiError: pkg.aiError ?? pkg.openaiError,
    intelligenceOpenaiError: pkg.aiError ?? pkg.openaiError,
  };
}
