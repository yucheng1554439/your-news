import "server-only";

import { getEnrichedStoryFromSnapshot } from "@/lib/intelligence/platform-snapshot";
import { hasDisplayableIntelligence } from "@/lib/intelligence/display";
import {
  mergeStoryIntelligenceSafely,
  verifyIntelligenceMatch,
  logIntelligenceMismatch,
} from "@/lib/intelligence/provenance";
import { attachPersonalizedImportance } from "@/lib/personalization/engine";
import { getStoryPool, invalidateStoryPool } from "@/lib/news/story-pool";
import { resolveStoryFromPool } from "@/lib/story-resolve";
import { enrichStories } from "@/lib/summaries";
import type { OnboardingProfile, Story, StoryCategory } from "@/lib/types";
import type { StoryPoolStatus } from "@/lib/news/story-pool";

export type StoriesResult = {
  stories: Story[];
  error: string | null;
  fromCache: boolean;
  fetchedAt: number;
  /** fresh | stale | empty */
  cacheStatus: StoryPoolStatus;
  /** Serving cached pool while NewsAPI is delayed or rate-limited. */
  liveDelayed: boolean;
  fromPersistentStore: boolean;
};

export type GetStoriesOptions = {
  profile?: OnboardingProfile | null;
  userId?: string | null;
  /** Admin/debug only — triggers NewsAPI ingest. */
  forceRefresh?: boolean;
  /** When false (default), returns news fast without blocking on AI. */
  enrich?: boolean;
};

/** @deprecated Use invalidateStoryPool */
export function invalidateStoriesCache(): void {
  invalidateStoryPool();
}

function applyProfileRanking(
  stories: Story[],
  profile: OnboardingProfile | null
): Story[] {
  if (!profile?.completed) return stories;
  return attachPersonalizedImportance(stories, profile);
}

async function loadPool(forceRefresh = false) {
  return getStoryPool({ forceRefresh });
}

function mergeSnapshotIntelligence(base: Story, enriched: Story): Story {
  return mergeStoryIntelligenceSafely(base, enriched, "getStoryBySlug snapshot");
}

async function withSnapshotIntelligence(story: Story): Promise<Story> {
  const enriched = await getEnrichedStoryFromSnapshot(story.slug);
  if (!enriched) return story;

  const match = verifyIntelligenceMatch(story, enriched);
  if (!match.match) {
    logIntelligenceMismatch("withSnapshotIntelligence", match);
    return story;
  }

  if (hasDisplayableIntelligence(enriched)) {
    return mergeSnapshotIntelligence(story, enriched);
  }
  return story;
}

export async function getStories(
  options?: GetStoriesOptions
): Promise<StoriesResult> {
  const pool = await loadPool(options?.forceRefresh);

  if (pool.stories.length === 0) {
    return {
      stories: [],
      error: pool.error,
      fromCache: pool.fromCache,
      fetchedAt: pool.fetchedAt,
      cacheStatus: pool.status,
      liveDelayed: pool.liveDelayed,
      fromPersistentStore: pool.fromPersistentStore,
    };
  }

  const profile = options?.profile ?? null;
  const shouldEnrich = options?.enrich === true;

  if (!shouldEnrich) {
    return {
      stories: applyProfileRanking(pool.stories, profile),
      error: pool.error,
      fromCache: pool.fromCache,
      fetchedAt: pool.fetchedAt,
      cacheStatus: pool.status,
      liveDelayed: pool.liveDelayed,
      fromPersistentStore: pool.fromPersistentStore,
    };
  }

  const enrichLimit = profile?.completed
    ? 10
    : profile?.interests?.length
      ? 6
      : 4;

  const enriched = await enrichStories(pool.stories, {
    limit: enrichLimit,
    profile,
  });

  return {
    stories: applyProfileRanking(enriched, profile),
    error: pool.error,
    fromCache: pool.fromCache,
    fetchedAt: pool.fetchedAt,
    cacheStatus: pool.status,
    liveDelayed: pool.liveDelayed,
    fromPersistentStore: pool.fromPersistentStore,
  };
}

export async function getAllStories(
  options?: GetStoriesOptions
): Promise<Story[]> {
  const { stories } = await getStories(options);
  return stories;
}

export async function getRawStoryBySlug(
  slug: string,
  _forceRefresh = false
): Promise<Story | undefined> {
  const pool = await loadPool(false);
  return resolveStoryFromPool(slug, pool.stories);
}

export async function getStoryBySlug(
  slug: string,
  options?: GetStoriesOptions
): Promise<Story | undefined> {
  const pool = await loadPool(options?.forceRefresh);
  const story = resolveStoryFromPool(slug, pool.stories);
  if (!story) return undefined;

  let merged = await withSnapshotIntelligence(story);

  if (options?.enrich !== true) {
    const profile = options?.profile ?? null;
    if (profile?.completed) {
      const [scored] = attachPersonalizedImportance([merged], profile);
      return scored;
    }
    return merged;
  }

  if (hasDisplayableIntelligence(merged)) {
    return merged;
  }

  return merged;
}

export async function getRelatedStories(
  slug: string,
  limit = 4,
  options?: GetStoriesOptions
): Promise<Story[]> {
  const pool = await loadPool(options?.forceRefresh);
  const current = resolveStoryFromPool(slug, pool.stories);
  if (!current) return pool.stories.slice(0, limit);

  return pool.stories
    .filter((s) => s.slug !== current.slug)
    .sort((a, b) => {
      const sharedTags = current.tags.filter((t) => b.tags.includes(t)).length;
      const sharedTagsA = current.tags.filter((t) => a.tags.includes(t)).length;
      const aScore =
        sharedTagsA * 3 +
        (a.category === current.category ? 2 : 0) +
        (a.importanceScore ?? 0) * 0.15;
      const bScore =
        sharedTags * 3 +
        (b.category === current.category ? 2 : 0) +
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
