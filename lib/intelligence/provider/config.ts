import "server-only";

import type { AIProviderId } from "@/lib/intelligence/provider/types";

const ANTHROPIC_DEFAULT_MODEL = "claude-3-5-sonnet-20241022";
const OPENAI_DEFAULT_MODEL = "gpt-4o-mini";

export function getAIProvider(): AIProviderId {
  const explicit = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (explicit === "anthropic" || explicit === "openai") {
    return explicit;
  }
  if (process.env.ANTHROPIC_API_KEY?.trim()) return "anthropic";
  if (process.env.OPENAI_API_KEY?.trim()) return "openai";
  return "anthropic";
}

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function isAIConfigured(): boolean {
  const provider = getAIProvider();
  return provider === "anthropic"
    ? isAnthropicConfigured()
    : isOpenAIConfigured();
}

export function getAnthropicModel(): string {
  return (
    process.env.ANTHROPIC_MODEL?.trim() ||
    process.env.CLAUDE_MODEL?.trim() ||
    ANTHROPIC_DEFAULT_MODEL
  );
}

export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL?.trim() || OPENAI_DEFAULT_MODEL;
}

export function getActiveModel(): string {
  return getAIProvider() === "anthropic"
    ? getAnthropicModel()
    : getOpenAIModel();
}

/** When false, intelligence throws instead of template fallback. */
export function isAIFallbackAllowed(): boolean {
  if (process.env.AI_ALLOW_FALLBACK === "false") return false;
  if (process.env.OPENAI_ALLOW_FALLBACK === "false") return false;
  return true;
}

export function intelligenceGeneratedByProvider(): AIProviderId {
  return getAIProvider();
}
