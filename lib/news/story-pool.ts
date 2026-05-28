import "server-only";

import { refreshEditorialCognition } from "@/lib/editorial/apply-cognition";
import { ingestStoriesFromNewsApi } from "@/lib/news/ingest";
import {
  readPersistedStoryPool,
  writePersistedStoryPool,
} from "@/lib/persistence/story-pool-persist";
import type { Story } from "@/lib/types";

/** Fresh window — serve cache without revalidation. Default 20 minutes. */
const DEFAULT_FRESH_TTL_MS = 20 * 60 * 1000;

export type StoryPoolStatus = "fresh" | "stale" | "empty";

export type StoryPoolSnapshot = {
  stories: Story[];
  error: string | null;
  rateLimited: boolean;
  fetchedAt: number;
  status: StoryPoolStatus;
  fromCache: boolean;
  /** True when serving cached stories while live ingest is delayed or failed. */
  liveDelayed: boolean;
  revalidating: boolean;
  /** Loaded from Redis/file last-good snapshot. */
  fromPersistentStore: boolean;
};

type PoolState = {
  stories: Story[];
  error: string | null;
  rateLimited: boolean;
  fetchedAt: number;
  revalidating: boolean;
  hydratedFromPersist: boolean;
};

type GlobalPool = {
  state: PoolState;
  inflight: Promise<void> | null;
};

const GLOBAL_KEY = "__your_news_story_pool__";

function freshTtlMs(): number {
  const raw = process.env.NEWS_CACHE_TTL_MS;
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 60_000) return parsed;
  }
  return DEFAULT_FRESH_TTL_MS;
}

function emptyState(): PoolState {
  return {
    stories: [],
    error: null,
    rateLimited: false,
    fetchedAt: 0,
    revalidating: false,
    hydratedFromPersist: false,
  };
}

function getGlobalPool(): GlobalPool {
  const g = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: GlobalPool;
  };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { state: emptyState(), inflight: null };
  }
  return g[GLOBAL_KEY];
}

function isFresh(fetchedAt: number, now = Date.now()): boolean {
  return fetchedAt > 0 && now - fetchedAt < freshTtlMs();
}

function toSnapshot(
  state: PoolState,
  options: {
    fromCache: boolean;
    status: StoryPoolStatus;
    liveDelayed: boolean;
  }
): StoryPoolSnapshot {
  const status =
    state.stories.length > 0 && options.status === "empty"
      ? "stale"
      : options.status;

  return {
    stories: state.stories,
    error: state.error,
    rateLimited: state.rateLimited,
    fetchedAt: state.fetchedAt,
    status,
    fromCache: options.fromCache,
    liveDelayed: options.liveDelayed,
    revalidating: state.revalidating,
    fromPersistentStore: state.hydratedFromPersist,
  };
}

async function hydrateFromPersistence(state: PoolState): Promise<boolean> {
  if (state.stories.length > 0) return true;

  const persisted = await readPersistedStoryPool();
  if (!persisted?.stories?.length) return false;

  state.stories =
    persisted.stories[0]?.narrativeClusterId != null
      ? persisted.stories
      : refreshEditorialCognition(persisted.stories);
  state.fetchedAt = persisted.fetchedAt;
  state.error = persisted.error;
  state.rateLimited = persisted.rateLimited;
  state.hydratedFromPersist = true;

  console.log(
    `[NEWS] Hydrated ${persisted.stories.length} stories from persistent cache (saved ${new Date(persisted.savedAt).toISOString()})`
  );
  return true;
}

async function persistState(state: PoolState): Promise<void> {
  if (state.stories.length === 0) return;
  await writePersistedStoryPool({
    stories: state.stories,
    error: state.error,
    rateLimited: state.rateLimited,
    fetchedAt: state.fetchedAt,
  });
}

async function applyIngestResult(
  state: PoolState,
  result: Awaited<ReturnType<typeof ingestStoriesFromNewsApi>>
): Promise<void> {
  if (result.stories.length > 0) {
    state.stories = result.stories;
    state.fetchedAt = result.ingestedAt;
    state.error = result.error;
    state.rateLimited = result.rateLimited;
    state.hydratedFromPersist = false;
    await persistState(state);
    return;
  }

  state.error = result.error ?? state.error;
  state.rateLimited = result.rateLimited || state.rateLimited;

  if (state.stories.length === 0) {
    await hydrateFromPersistence(state);
    if (state.stories.length === 0) {
      state.fetchedAt = result.ingestedAt;
    }
  }
}

async function runRevalidation(force = false): Promise<void> {
  const pool = getGlobalPool();
  const { state } = pool;

  if (pool.inflight) {
    await pool.inflight;
    return;
  }

  if (!force && isFresh(state.fetchedAt) && state.stories.length > 0) {
    return;
  }

  state.revalidating = true;

  pool.inflight = (async () => {
    try {
      const result = await ingestStoriesFromNewsApi();
      await applyIngestResult(state, result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "News ingest failed unexpectedly";
      state.error = message;
      console.error(`[NEWS] Ingest error — ${message}`);
      await hydrateFromPersistence(state);
    } finally {
      state.revalidating = false;
      pool.inflight = null;
    }
  })();

  await pool.inflight;
}

export function invalidateStoryPool(): void {
  const pool = getGlobalPool();
  pool.state = emptyState();
  pool.inflight = null;
}

export type GetStoryPoolOptions = {
  forceRefresh?: boolean;
};

/**
 * Central story pool — all routes read from here.
 * Persistent last-good snapshot survives cold starts and rate limits.
 */
export async function getStoryPool(
  options: GetStoryPoolOptions = {}
): Promise<StoryPoolSnapshot> {
  const pool = getGlobalPool();
  const { state } = pool;
  const now = Date.now();
  const force = options.forceRefresh === true;

  await hydrateFromPersistence(state);

  if (force) {
    await runRevalidation(true);
    if (state.stories.length === 0) {
      await hydrateFromPersistence(state);
    }
    const status: StoryPoolStatus =
      state.stories.length > 0 ? (isFresh(state.fetchedAt) ? "fresh" : "stale") : "empty";
    return toSnapshot(state, {
      fromCache: !force,
      status,
      liveDelayed: status === "stale",
    });
  }

  let hasStories = state.stories.length > 0;
  const fresh = hasStories && isFresh(state.fetchedAt, now);

  if (hasStories) {
    return toSnapshot(state, {
      fromCache: true,
      status: fresh ? "fresh" : "stale",
      liveDelayed: false,
    });
  }

  if (state.stories.length === 0) {
    await hydrateFromPersistence(state);
  }

  hasStories = state.stories.length > 0;
  const status: StoryPoolStatus = hasStories
    ? isFresh(state.fetchedAt, now)
      ? "fresh"
      : "stale"
    : "empty";

  return toSnapshot(state, {
    fromCache: hasStories,
    status,
    liveDelayed: hasStories && (Boolean(state.error) || state.rateLimited || status === "stale"),
  });
}
