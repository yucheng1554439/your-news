import "server-only";

import { createMemoryStore } from "@/lib/cache/memory-store";
import {
  readPersistedArticleBody,
  writePersistedArticleBody,
} from "@/lib/persistence/article-body-persist";

export type ArticleBodySource = "url" | "newsapi" | "excerpt";

type CachedBody = {
  body: string;
  source: ArticleBodySource;
  fetchedAt: string;
};

const bodyStore = createMemoryStore<CachedBody>({
  ttlMs: 2 * 60 * 60 * 1000,
  maxEntries: 200,
});

function cacheKey(url: string): string {
  return url.slice(0, 512);
}

export function readCachedBody(url: string): CachedBody | null {
  const mem = bodyStore.get(cacheKey(url));
  if (mem) return mem;

  return null;
}

/** Memory L1 + async persistent load (call before fetch when possible). */
export async function readCachedBodyAsync(
  url: string
): Promise<CachedBody | null> {
  const mem = readCachedBody(url);
  if (mem) return mem;

  const persisted = await readPersistedArticleBody(url);
  if (persisted) {
    bodyStore.set(cacheKey(url), persisted);
    return persisted;
  }

  return null;
}

export function writeCachedBody(
  url: string,
  body: string,
  source: ArticleBodySource
): void {
  const entry: CachedBody = {
    body,
    source,
    fetchedAt: new Date().toISOString(),
  };
  bodyStore.set(cacheKey(url), entry);
  void writePersistedArticleBody(url, body, source);
}
