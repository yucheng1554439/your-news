import "server-only";

import type { ParseSectionStatus } from "@/lib/intelligence/parse-log";

export type StoredAIResponse = {
  at: number;
  label: string;
  provider: "anthropic" | "openai";
  format: "tags" | "json";
  ok: boolean;
  error?: string;
  rawLength: number;
  raw: string;
  parseStatus?: ParseSectionStatus;
  missingTags?: string[];
  foundTags?: string[];
};

const MAX_ENTRIES = 12;
const STORE_KEY = "__your_news_latest_ai_responses__";

function getStore(): StoredAIResponse[] {
  const g = globalThis as typeof globalThis & {
    [STORE_KEY]?: StoredAIResponse[];
  };
  if (!g[STORE_KEY]) g[STORE_KEY] = [];
  return g[STORE_KEY]!;
}

export function recordAIResponse(entry: Omit<StoredAIResponse, "at" | "rawLength">): void {
  const store = getStore();
  store.unshift({
    ...entry,
    at: Date.now(),
    rawLength: entry.raw.length,
  });
  if (store.length > MAX_ENTRIES) store.length = MAX_ENTRIES;
}

export function getLatestAIResponse(): StoredAIResponse | null {
  return getStore()[0] ?? null;
}

export function getLatestFailedAIResponse(): StoredAIResponse | null {
  return getStore().find((e) => !e.ok) ?? null;
}

export function getRecentAIResponses(limit = 5): StoredAIResponse[] {
  return getStore().slice(0, limit);
}
