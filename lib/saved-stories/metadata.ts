import type { Story, StoryCategory } from "@/lib/types";

export const SAVED_STORIES_METADATA_KEY = "savedStories";
export const MAX_SAVED_STORIES = 80;

export type SavedStoryRef = {
  slug: string;
  headline: string;
  imageUrl: string;
  source: string;
  publishedAt: string;
  category: StoryCategory;
  savedAt: number;
};

export type SavedStoriesMetadata = {
  items: SavedStoryRef[];
  updatedAt: number;
};

export function storyToSavedRef(story: Story): SavedStoryRef {
  return {
    slug: story.slug,
    headline: story.headline,
    imageUrl: story.imageUrl,
    source: story.source,
    publishedAt: story.publishedAt,
    category: story.category,
    savedAt: Date.now(),
  };
}

export function parseSavedStoriesFromMetadata(
  metadata: Record<string, unknown> | undefined | null
): SavedStoriesMetadata {
  const raw = metadata?.[SAVED_STORIES_METADATA_KEY];
  if (!raw || typeof raw !== "object") {
    return { items: [], updatedAt: 0 };
  }

  const obj = raw as { items?: unknown; updatedAt?: unknown };
  const items = Array.isArray(obj.items)
    ? obj.items
        .filter(
          (item): item is SavedStoryRef =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as SavedStoryRef).slug === "string"
        )
        .slice(0, MAX_SAVED_STORIES)
    : [];

  return {
    items,
    updatedAt: typeof obj.updatedAt === "number" ? obj.updatedAt : 0,
  };
}

export function isSlugSaved(
  metadata: SavedStoriesMetadata,
  slug: string
): boolean {
  return metadata.items.some((item) => item.slug === slug);
}
