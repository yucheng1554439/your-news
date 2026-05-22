import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { fetchLiveStories } from "@/lib/news";
import { enrichStories, enrichStoryWithIntelligence } from "@/lib/summaries";
import type { OnboardingProfile, Story, StoryCategory } from "@/lib/types";

export type StoriesResult = {
  stories: Story[];
  error: string | null;
  fromCache: boolean;
  fetchedAt: number;
};

let cachedRawStories: Story[] | null = null;
let cachedError: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 45 * 1000;

export type GetStoriesOptions = {
  profile?: OnboardingProfile | null;
  userId?: string | null;
  forceRefresh?: boolean;
};

export function invalidateStoriesCache(): void {
  cachedRawStories = null;
  cacheTimestamp = 0;
}

async function getRawStories(forceRefresh = false): Promise<{
  stories: Story[];
  error: string | null;
  fromCache: boolean;
  fetchedAt: number;
}> {
  noStore();

  const now = Date.now();
  if (
    !forceRefresh &&
    cachedRawStories &&
    now - cacheTimestamp < CACHE_TTL_MS
  ) {
    return {
      stories: cachedRawStories,
      error: cachedError,
      fromCache: true,
      fetchedAt: cacheTimestamp,
    };
  }

  const { stories, error } = await fetchLiveStories();

  if (stories.length === 0) {
    cachedError = error;
    if (cachedRawStories) {
      return {
        stories: cachedRawStories,
        error,
        fromCache: true,
        fetchedAt: cacheTimestamp,
      };
    }
    return { stories: [], error, fromCache: false, fetchedAt: now };
  }

  cachedRawStories = stories;
  cachedError = error;
  cacheTimestamp = now;

  return { stories, error, fromCache: false, fetchedAt: now };
}

export async function getStories(
  options?: GetStoriesOptions
): Promise<StoriesResult> {
  const { stories: raw, error, fromCache, fetchedAt } = await getRawStories(
    options?.forceRefresh
  );
  if (raw.length === 0) {
    return { stories: [], error, fromCache, fetchedAt };
  }

  const enriched = await enrichStories(raw, {
    limit: options?.profile?.completed ? 8 : 4,
    profile: options?.profile ?? null,
  });

  return { stories: enriched, error, fromCache, fetchedAt };
}

export async function getAllStories(
  options?: GetStoriesOptions
): Promise<Story[]> {
  const { stories } = await getStories(options);
  return stories;
}

export async function getStoryBySlug(
  slug: string,
  options?: GetStoriesOptions
): Promise<Story | undefined> {
  const { stories: raw } = await getRawStories(options?.forceRefresh);
  const story = raw.find((s) => s.slug === slug);
  if (!story) return undefined;
  return enrichStoryWithIntelligence(story, options?.profile ?? null);
}

export async function getRelatedStories(
  slug: string,
  limit = 4,
  options?: GetStoriesOptions
): Promise<Story[]> {
  const stories = await getAllStories(options);
  const current = stories.find((s) => s.slug === slug);
  if (!current) return stories.slice(0, limit);

  return stories
    .filter((s) => s.slug !== slug)
    .sort((a, b) => {
      const aScore =
        (a.category === current.category ? 2 : 0) +
        a.tags.filter((t) => current.tags.includes(t)).length +
        (a.importanceScore ?? 0) * 0.15;
      const bScore =
        (b.category === current.category ? 2 : 0) +
        b.tags.filter((t) => current.tags.includes(t)).length +
        (b.importanceScore ?? 0) * 0.15;
      return bScore - aScore;
    })
    .slice(0, limit);
}

export async function getStoriesByCategory(
  category: StoryCategory,
  options?: GetStoriesOptions
): Promise<Story[]> {
  const stories = await getAllStories(options);
  return stories.filter((s) => s.category === category);
}
