import "server-only";

import { createHash } from "crypto";
import { PERSIST_KEYS } from "@/lib/persistence/keys";
import { persistGet, persistSet } from "@/lib/persistence/kv-store";
import type { ArticleBodySource } from "@/lib/extraction/cache";

export type PersistedArticleBody = {
  body: string;
  source: ArticleBodySource;
  fetchedAt: string;
};

type BodyIndex = Record<string, PersistedArticleBody>;

const BODY_TTL_SECONDS = 7 * 24 * 60 * 60;

function urlKey(url: string): string {
  return createHash("sha256").update(url.trim().toLowerCase()).digest("hex").slice(0, 24);
}

async function readBodyIndex(): Promise<BodyIndex> {
  return (await persistGet<BodyIndex>(PERSIST_KEYS.articleBodies)) ?? {};
}

async function writeBodyIndex(index: BodyIndex): Promise<void> {
  const keys = Object.keys(index);
  if (keys.length === 0) return;

  if (keys.length > 250) {
    const sorted = keys.sort(
      (a, b) =>
        new Date(index[b].fetchedAt).getTime() -
        new Date(index[a].fetchedAt).getTime()
    );
    for (const drop of sorted.slice(250)) {
      delete index[drop];
    }
  }

  await persistSet(PERSIST_KEYS.articleBodies, index, {
    exSeconds: BODY_TTL_SECONDS,
  });
}

export async function readPersistedArticleBody(
  sourceUrl: string
): Promise<PersistedArticleBody | null> {
  const index = await readBodyIndex();
  return index[urlKey(sourceUrl)] ?? null;
}

export async function writePersistedArticleBody(
  sourceUrl: string,
  body: string,
  source: ArticleBodySource
): Promise<void> {
  if (!body.trim() || body.length < 80) return;

  const index = await readBodyIndex();
  index[urlKey(sourceUrl)] = {
    body,
    source,
    fetchedAt: new Date().toISOString(),
  };
  await writeBodyIndex(index);
}
