import "server-only";

export type { StoryIntelligencePackage as IntelligenceBriefing } from "@/lib/intelligence/types";
export { isOpenAIConfigured } from "@/lib/intelligence/openai";
export { applyIntelligenceToStory as applyBriefingToStory } from "@/lib/intelligence/apply";
export { resolveStoryIntelligence } from "@/lib/intelligence/engine";
