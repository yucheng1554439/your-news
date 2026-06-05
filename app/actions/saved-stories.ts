"use server";

import { auth } from "@clerk/nextjs/server";
import {
  getSavedStoriesForUserId,
  toggleSavedStoryForUserId,
} from "@/lib/services/saved-stories";
import type { SavedStoryRef } from "@/lib/saved-stories/metadata";
import type { Story } from "@/lib/types";

export async function getSavedStoriesFromClerk(): Promise<SavedStoryRef[]> {
  const { userId } = await auth();
  if (!userId) return [];
  return getSavedStoriesForUserId(userId);
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
  return toggleSavedStoryForUserId(userId, story);
}
