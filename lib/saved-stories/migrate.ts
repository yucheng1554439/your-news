import "server-only";

import { getEnrichedStoryFromSnapshot } from "@/lib/intelligence/platform-snapshot";
import { getStoryPool } from "@/lib/news/story-pool";
import type { Story } from "@/lib/types";
import {
  isLegacySavedRef,
  storyToSavedSnapshot,
  type SavedStorySnapshot,
} from "@/lib/saved-stories/metadata";

async function resolveLiveStory(slug: string): Promise<Story | null> {
  const pool = await getStoryPool();
  const fromPool = pool.stories.find((s) => s.slug === slug);
  if (fromPool) return fromPool;

  const enriched = await getEnrichedStoryFromSnapshot(slug);
  return enriched;
}

/**
 * Upgrade legacy slug-only refs to full snapshots when the story is still in corpus.
 */
export async function migrateSavedStoryItems(
  items: SavedStorySnapshot[]
): Promise<{ items: SavedStorySnapshot[]; changed: boolean }> {
  let changed = false;
  const next: SavedStorySnapshot[] = [];

  for (const item of items) {
    if (!isLegacySavedRef(item)) {
      next.push(item);
      continue;
    }

    const live = await resolveLiveStory(item.slug);
    if (live) {
      next.push(storyToSavedSnapshot(live, item.savedAt));
      changed = true;
      continue;
    }

    next.push({
      ...item,
      snapshotVersion: 2,
      summary: item.summary?.trim() || item.headline,
      whyItMatters: item.whyItMatters ?? "",
      tags: item.tags?.length ? item.tags : [item.category],
      needsRehydration: true,
    });
    changed = true;
  }

  return {
    items: [...next].sort((a, b) => b.savedAt - a.savedAt),
    changed,
  };
}
