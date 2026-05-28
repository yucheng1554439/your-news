import "server-only";

import { callAnthropicJson, pingAnthropic } from "@/lib/intelligence/provider/anthropic";
import {
  getAIProvider,
  getActiveModel,
  getAnthropicModel,
  getOpenAIModel,
  isAIConfigured,
  isAIFallbackAllowed,
  isAnthropicConfigured,
  isOpenAIConfigured,
  intelligenceGeneratedByProvider,
} from "@/lib/intelligence/provider/config";
import { callOpenAIJson, pingOpenAI } from "@/lib/intelligence/provider/openai";
import type {
  AIHealthResult,
  CallAIJsonOptions,
  CallAIJsonResult,
} from "@/lib/intelligence/provider/types";

export type {
  AIProviderId,
  AIUsage,
  AICallMeta,
  AIHealthResult,
  CallAIJsonOptions,
  CallAIJsonResult,
} from "@/lib/intelligence/provider/types";

export {
  getAIProvider,
  getActiveModel,
  getAnthropicModel,
  getOpenAIModel,
  isAIConfigured,
  isAIFallbackAllowed,
  isAnthropicConfigured,
  isOpenAIConfigured,
  intelligenceGeneratedByProvider,
};

/** Route JSON intelligence calls to the configured provider (Anthropic by default). */
export async function callAIJson<T>(
  options: CallAIJsonOptions<T>
): Promise<CallAIJsonResult<T>> {
  const provider = getAIProvider();
  if (provider === "anthropic") {
    return callAnthropicJson(options);
  }
  return callOpenAIJson(options);
}

export async function pingAI(): Promise<AIHealthResult> {
  const provider = getAIProvider();
  if (provider === "anthropic") {
    const result = await pingAnthropic();
    return { provider: "anthropic", ...result };
  }
  const result = await pingOpenAI();
  return { provider: "openai", ...result };
}

export async function pingAnthropicHealth(): Promise<AIHealthResult> {
  const result = await pingAnthropic();
  return { provider: "anthropic", ...result };
}
