import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { StoryIntelligencePackage } from "@/lib/intelligence/types";

const CACHE_DIR = path.join(process.cwd(), ".cache", "intelligence-v2");
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type CachedPayload = {
  fingerprint: string;
  generatedAt: string;
  package: StoryIntelligencePackage;
};

function cachePath(slug: string, profileHash: string): string {
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "_").slice(0, 80);
  return path.join(CACHE_DIR, `${safeSlug}-${profileHash}.json`);
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
  try {
    const raw = await readFile(cachePath(slug, profileHash), "utf-8");
    const entry = JSON.parse(raw) as CachedPayload;
    if (entry.fingerprint !== expectedFingerprint) return null;
    if (Date.now() - new Date(entry.generatedAt).getTime() > CACHE_TTL_MS) {
      return null;
    }
    return entry.package;
  } catch {
    return null;
  }
}

export async function writeIntelligenceCache(
  slug: string,
  profileHash: string,
  fingerprint: string,
  pkg: StoryIntelligencePackage
): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  const entry: CachedPayload = {
    fingerprint,
    generatedAt: new Date().toISOString(),
    package: pkg,
  };
  await writeFile(
    cachePath(slug, profileHash),
    JSON.stringify(entry, null, 2),
    "utf-8"
  );
}
