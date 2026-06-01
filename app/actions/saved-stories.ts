"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { mergePublicMetadata } from "@/lib/clerk/merge-public-metadata";
import {
  parseReadingSignalsFromMetadata,
  recordStorySaved,
} from "@/lib/personalization/reading-signals-metadata";
import {
  MAX_SAVED_STORIES,
  parseSavedStoriesFromMetadata,
  storyToSavedRef,
  type SavedStoryRef,
  type SavedStoriesMetadata,
} from "@/lib/saved-stories/metadata";
import { getAllStoryTags } from "@/lib/intelligence/story-tags";
import type { Story } from "@/lib/types";

async function readSavedMetadata(userId: string): Promise<{
  publicMetadata: Record<string, unknown>;
  saved: SavedStoriesMetadata;
}> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const publicMetadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
  return {
    publicMetadata,
    saved: parseSavedStoriesFromMetadata(publicMetadata),
  };
}

export async function getSavedStoriesFromClerk(): Promise<SavedStoryRef[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const { saved } = await readSavedMetadata(userId);
  return [...saved.items].sort((a, b) => b.savedAt - a.savedAt);
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
    const { publicMetadata, saved } = await readSavedMetadata(userId);
    const exists = saved.items.some((item) => item.slug === story.slug);

    let items: SavedStoryRef[];
    if (exists) {
      items = saved.items.filter((item) => item.slug !== story.slug);
    } else {
      items = [storyToSavedRef(story), ...saved.items].slice(0, MAX_SAVED_STORIES);
    }

    const savedStories: SavedStoriesMetadata = {
      items,
      updatedAt: Date.now(),
    };

    let nextMeta = mergePublicMetadata(publicMetadata, { savedStories });

    if (!exists) {
      const reading = parseReadingSignalsFromMetadata(publicMetadata);
      nextMeta = mergePublicMetadata(nextMeta, {
        readingSignals: recordStorySaved(
          reading,
          getAllStoryTags(story),
          story.primaryCategory ?? story.category
        ),
      });
    }

    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: nextMeta,
    });

    return { ok: true, saved: !exists, items };
  } catch {
    return { ok: false, error: "Could not update saved stories" };
  }
}
