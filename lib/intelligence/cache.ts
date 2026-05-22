import "server-only";

import { createMemoryStore } from "@/lib/cache/memory-store";
import type { StoryIntelligencePackage } from "@/lib/intelligence/types";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type CachedPayload = {
  fingerprint: string;
  generatedAt: string;
  package: StoryIntelligencePackage;
};

const intelligenceStore = createMemoryStore<CachedPayload>({
  ttlMs: CACHE_TTL_MS,
  maxEntries: 300,
});

function cacheKey(slug: string, profileHash: string): string {
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "_").slice(0, 80);
  return `${safeSlug}:${profileHash}`;
}

export function contentFingerprint(
  headline: string,
  publishedAt: string,
  rawExcerpt?: string
): string {
  return `${headline.slice(0, 80)}|${publishedAt}|${(rawExcerpt ?? "").slice(0, 120)}`;
}

export async function readIntelligenceCache(
  slug: string,
  profileHash: string,
  expectedFingerprint: string
): Promise<StoryIntelligencePackage | null> {
  const entry = intelligenceStore.get(cacheKey(slug, profileHash));
  if (!entry) return null;
  if (entry.fingerprint !== expectedFingerprint) return null;
  return entry.package;
}

export async function writeIntelligenceCache(
  slug: string,
  profileHash: string,
  fingerprint: string,
  pkg: StoryIntelligencePackage
): Promise<void> {
  intelligenceStore.set(cacheKey(slug, profileHash), {
    fingerprint,
    generatedAt: new Date().toISOString(),
    package: pkg,
  });
}
