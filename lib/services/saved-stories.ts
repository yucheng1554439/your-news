import "server-only";

import { recordStorySaved } from "@/lib/personalization/reading-signals-metadata";
import {
  getSavedSnapshotBySlug,
  MAX_SAVED_STORIES,
  storyToSavedSnapshot,
  type SavedStorySnapshot,
} from "@/lib/saved-stories/metadata";
import { migrateSavedStoryItems } from "@/lib/saved-stories/migrate";
import { getAllStoryTags } from "@/lib/intelligence/story-tags";
import {
  loadUserProfile,
  patchUserProfile,
} from "@/lib/user-profile/store";
import type { Story } from "@/lib/types";

export type SavedStoriesToggleResult =
  | { ok: true; saved: boolean; items: SavedStorySnapshot[] }
  | { ok: false; error: string };

async function loadMigratedSavedStories(
  userId: string
): Promise<SavedStorySnapshot[]> {
  const record = await loadUserProfile(userId);
  const { items, changed } = await migrateSavedStoryItems(
    record.savedStories.items
  );

  if (changed) {
    await patchUserProfile(userId, {
      savedStories: { items, updatedAt: Date.now() },
    });
  }

  return items;
}

export async function getSavedStoriesForUserId(
  userId: string
): Promise<SavedStorySnapshot[]> {
  return loadMigratedSavedStories(userId);
}

export async function getSavedStorySnapshotForUser(
  userId: string,
  slug: string
): Promise<SavedStorySnapshot | null> {
  const items = await loadMigratedSavedStories(userId);
  return getSavedSnapshotBySlug(items, slug) ?? null;
}

export async function toggleSavedStoryForUserId(
  userId: string,
  story: Story
): Promise<SavedStoriesToggleResult> {
  try {
    const record = await loadUserProfile(userId);
    const exists = record.savedStories.items.some(
      (item) => item.slug === story.slug
    );

    let items: SavedStorySnapshot[];
    if (exists) {
      items = record.savedStories.items.filter(
        (item) => item.slug !== story.slug
      );
    } else {
      items = [
        storyToSavedSnapshot(story),
        ...record.savedStories.items,
      ].slice(0, MAX_SAVED_STORIES);
    }

    const savedStories = { items, updatedAt: Date.now() };
    let readingSignals = record.readingSignals;

    if (!exists) {
      readingSignals = recordStorySaved(
        readingSignals,
        getAllStoryTags(story),
        story.primaryCategory ?? story.category
      );
    }

    const result = await patchUserProfile(userId, {
      savedStories,
      readingSignals,
    });

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    return {
      ok: true,
      saved: !exists,
      items: [...result.record.savedStories.items].sort(
        (a, b) => b.savedAt - a.savedAt
      ),
    };
  } catch (err) {
    console.error(
      "[USER_PROFILE] toggle_saved_failed",
      err instanceof Error ? err.message : err
    );
    return { ok: false, error: "Could not update saved stories" };
  }
}