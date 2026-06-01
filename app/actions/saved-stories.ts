"use server";

import { auth } from "@clerk/nextjs/server";
import { recordStorySaved } from "@/lib/personalization/reading-signals-metadata";
import {
  MAX_SAVED_STORIES,
  storyToSavedRef,
  type SavedStoryRef,
} from "@/lib/saved-stories/metadata";
import { getAllStoryTags } from "@/lib/intelligence/story-tags";
import {
  getSavedStoryRefsForUser,
  loadUserProfile,
  patchUserProfile,
} from "@/lib/user-profile/store";
import type { Story } from "@/lib/types";

export async function getSavedStoriesFromClerk(): Promise<SavedStoryRef[]> {
  const { userId } = await auth();
  if (!userId) return [];
  return getSavedStoryRefsForUser(userId);
}

export async function toggleSavedStory(
  story: Story
): Promise<
  | { ok: true; saved: boolean; items: SavedStoryRef[] }
  | { ok: false; error: string }
> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Sign in to save stories" };
  }

  try {
    const record = await loadUserProfile(userId);
    const exists = record.savedStories.items.some(
      (item) => item.slug === story.slug
    );

    let items: SavedStoryRef[];
    if (exists) {
      items = record.savedStories.items.filter(
        (item) => item.slug !== story.slug
      );
    } else {
      items = [storyToSavedRef(story), ...record.savedStories.items].slice(
        0,
        MAX_SAVED_STORIES
      );
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
