/**
 * @deprecated Import from `@/lib/intelligence/provider` instead.
 */
export {
  callAIJson,
  callAIJson as callOpenAIJson,
  pingAI,
  pingAnthropicHealth,
  getAIProvider,
  getActiveModel,
  getAnthropicModel,
  getOpenAIModel,
  isAIConfigured,
  isAIFallbackAllowed,
  isAIFallbackAllowed as isOpenAIFallbackAllowed,
  isAnthropicConfigured,
  isOpenAIConfigured,
  intelligenceGeneratedByProvider,
} from "@/lib/intelligence/provider";

export type { AIUsage as OpenAIUsage, AICallMeta as OpenAICallMeta } from "@/lib/intelligence/provider";
