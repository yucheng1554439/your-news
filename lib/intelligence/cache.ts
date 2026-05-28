import "server-only";

import { createMemoryStore } from "@/lib/cache/memory-store";
import { getModelCacheToken } from "@/lib/intelligence/provider/config";
import { storyIntelligenceKey } from "@/lib/persistence/keys";
import { persistGet, persistSet } from "@/lib/persistence/kv-store";
import type { StoryIntelligencePackage } from "@/lib/intelligence/types";

/** In-memory layer for hot reads within a single instance. */
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const INTELLIGENCE_REDIS_TTL_SECONDS = 7 * 24 * 60 * 60;

type CachedPayload = {
  fingerprint: string;
  generatedAt: string;
  package: StoryIntelligencePackage;
};

const intelligenceStore = createMemoryStore<CachedPayload>({
  ttlMs: CACHE_TTL_MS,
  maxEntries: 300,
});

function memoryCacheKey(slug: string, profileHash: string): string {
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "_").slice(0, 80);
  return `${safeSlug}:${profileHash}`;
}

/** Bump when prompt/output shape changes to avoid serving stale generations. */
const GENERATION_VERSION = "tags-v14-multi";

export function contentFingerprint(
  headline: string,
  publishedAt: string,
  bodyMaterial?: string,
  bodyHash?: string
): string {
  const bodySlice = (bodyMaterial ?? "").slice(0, 200);
  return `${GENERATION_VERSION}|${getModelCacheToken()}|${headline.slice(0, 80)}|${publishedAt}|${bodySlice}|${bodyHash ?? ""}`;
}

export async function readIntelligenceCache(
  slug: string,
  profileHash: string,
  expectedFingerprint: string
): Promise<StoryIntelligencePackage | null> {
  const memKey = memoryCacheKey(slug, profileHash);
  const memEntry = intelligenceStore.get(memKey);
  if (memEntry?.fingerprint === expectedFingerprint) {
    return memEntry.package;
  }

  const redisKey = storyIntelligenceKey(slug, profileHash);
  const persisted = await persistGet<CachedPayload>(redisKey);
  if (
    persisted?.fingerprint === expectedFingerprint &&
    persisted.package
  ) {
    intelligenceStore.set(memKey, persisted);
    return persisted.package;
  }

  return null;
}

export async function writeIntelligenceCache(
  slug: string,
  profileHash: string,
  fingerprint: string,
  pkg: StoryIntelligencePackage
): Promise<void> {
  const memKey = memoryCacheKey(slug, profileHash);
  const payload: CachedPayload = {
    fingerprint,
    generatedAt: new Date().toISOString(),
    package: pkg,
  };

  intelligenceStore.set(memKey, payload);

  const redisKey = storyIntelligenceKey(slug, profileHash);
  const result = await persistSet(redisKey, payload, {
    exSeconds: INTELLIGENCE_REDIS_TTL_SECONDS,
  });

  if (!result.ok) {
    console.warn(
      `[PERSIST] Story intelligence cache write failed for ${slug}: ${result.error}`
    );
  }
}
