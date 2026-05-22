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
    economicImplications: pkg.strategicImplications,
    perspectives: pkg.perspectives,
    marketReaction: pkg.marketRead,
    sourceContext: pkg.sourceLens,
  };
}
