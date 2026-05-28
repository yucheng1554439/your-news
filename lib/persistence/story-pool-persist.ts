import "server-only";

import { PERSIST_KEYS } from "@/lib/persistence/keys";
import {
  isPersistenceAvailable,
  persistGet,
  persistSet,
} from "@/lib/persistence/kv-store";
import type { Story } from "@/lib/types";

export type PersistedStoryPool = {
  version: 1;
  stories: Story[];
  error: string | null;
  rateLimited: boolean;
  fetchedAt: number;
  savedAt: number;
};

export function isStoryPoolPersistenceEnabled(): boolean {
  return isPersistenceAvailable();
}

export async function readPersistedStoryPool(): Promise<PersistedStoryPool | null> {
  const pool = await persistGet<PersistedStoryPool>(PERSIST_KEYS.storyPool);
  if (pool?.stories?.length) return pool;
  return null;
}

export async function writePersistedStoryPool(
  snapshot: Omit<PersistedStoryPool, "version" | "savedAt"> & {
    stories: Story[];
  }
): Promise<boolean> {
  if (snapshot.stories.length === 0) return false;

  const payload: PersistedStoryPool = {
    version: 1,
    stories: snapshot.stories,
    error: snapshot.error,
    rateLimited: snapshot.rateLimited,
    fetchedAt: snapshot.fetchedAt,
    savedAt: Date.now(),
  };

  const result = await persistSet(PERSIST_KEYS.storyPool, payload);
  if (result.ok) {
    console.log(
      `[PERSIST] Story pool saved (${result.backend}) — ${payload.stories.length} stories`
    );
    return true;
  }

  console.error(`[PERSIST] Story pool write failed: ${result.error}`);
  return false;
}
