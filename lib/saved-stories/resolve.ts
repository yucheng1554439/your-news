import type { SavedStoryRef } from "@/lib/saved-stories/metadata";
import { resolveStoryFromPool } from "@/lib/story-resolve";
import type { Story } from "@/lib/types";

/** Minimal story for cards when live feed no longer has the article. */
export function savedRefToStory(ref: SavedStoryRef): Story {
  return {
    slug: ref.slug,
    headline: ref.headline,
    summary: ref.headline,
    whyItMatters: "",
    category: ref.category,
    tags: [ref.category],
    importance: "medium",
    imageUrl: ref.imageUrl,
    publishedAt: ref.publishedAt,
    source: ref.source,
    readTime: 5,
  };
}

export function resolveSavedStories(
  saved: SavedStoryRef[],
  liveStories: Story[]
): Story[] {
  return saved.map(
    (ref) => resolveStoryFromPool(ref.slug, liveStories) ?? savedRefToStory(ref)
  );
}
