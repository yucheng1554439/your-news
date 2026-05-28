import "server-only";

import { getProfileBriefingFingerprint } from "@/lib/briefing/profile-fingerprint";
import {
  resolveWeeklyBriefing,
  type WeeklyBriefing,
  type WeeklyBriefingMode,
} from "@/lib/briefing/weekly-engine";
import { buildWeeklyBriefingSync } from "@/lib/weekly-briefing";
import { getStoryPool } from "@/lib/news/story-pool";
import { attachPersonalizedImportance } from "@/lib/personalization/engine";
import {
  readPlatformIntelligenceSnapshot,
  recordRefreshAttempt,
  writePlatformIntelligenceSnapshot,
  type PlatformIntelligenceSnapshot,
} from "@/lib/persistence/intelligence-snapshot-persist";
import { readIntelligenceMeta } from "@/lib/persistence/intelligence-meta-persist";
import {
  getRedisConfigDiagnostics,
  isRedisConfigured,
  pingRedis,
} from "@/lib/persistence/redis-client";
import { isRemotePersistenceConfigured } from "@/lib/persistence/kv-store";
import { enrichStories } from "@/lib/summaries";
import type { OnboardingProfile, Story } from "@/lib/types";
import type { StoryPoolStatus } from "@/lib/news/story-pool";

const REFRESH_LOCK_KEY = "__your_news_intelligence_refresh__";

export type PlatformDashboard = {
  stories: Story[];
  briefings: Partial<Record<WeeklyBriefingMode, WeeklyBriefing>>;
  error: string | null;
  fromCache: boolean;
  fetchedAt: number;
  intelligenceUpdatedAt: number | null;
  cacheStatus: StoryPoolStatus;
  liveDelayed: boolean;
  fromPersistentStore: boolean;
  hasIntelligenceSnapshot: boolean;
  persistenceConfigured: boolean;
  persistenceSource: string | null;
};

function mergeEnrichedStories(
  poolStories: Story[],
  enrichedBySlug: Record<string, Story>
): Story[] {
  if (Object.keys(enrichedBySlug).length === 0) return poolStories;

  return poolStories.map((story) => {
    const enriched = enrichedBySlug[story.slug];
    if (!enriched) return story;
    return {
      ...story,
      summary: enriched.summary,
      whyItMatters: enriched.whyItMatters,
      whyItMattersToYou: enriched.whyItMattersToYou,
      nextWatch: enriched.nextWatch,
      economicImplications: enriched.economicImplications,
      perspectives: enriched.perspectives,
      marketReaction: enriched.marketReaction,
      sourceContext: enriched.sourceContext,
      intelligenceGeneratedBy: enriched.intelligenceGeneratedBy,
      intelligenceAiError: enriched.intelligenceAiError,
      intelligenceOpenaiError: enriched.intelligenceOpenaiError,
    };
  });
}

function briefingForMode(
  snapshot: PlatformIntelligenceSnapshot | null,
  stories: Story[],
  mode: WeeklyBriefingMode,
  profile: OnboardingProfile | null
): WeeklyBriefing {
  const cached = snapshot?.briefings?.[mode];
  if (cached && cached.mode === mode) return cached;

  return buildWeeklyBriefingSync(stories, mode, profile);
}

export async function loadPlatformDashboard(
  profile: OnboardingProfile | null
): Promise<PlatformDashboard> {
  const pool = await getStoryPool();
  const snapshot = await readPlatformIntelligenceSnapshot();
  const meta = await readIntelligenceMeta();
  const redisDiag = getRedisConfigDiagnostics();

  const merged = mergeEnrichedStories(
    pool.stories,
    snapshot?.enrichedBySlug ?? {}
  );

  const ranked = profile?.completed
    ? attachPersonalizedImportance(merged, profile)
    : merged;

  const briefings: Partial<Record<WeeklyBriefingMode, WeeklyBriefing>> = {
    global: briefingForMode(snapshot, ranked, "global", profile),
    "for-you": briefingForMode(snapshot, ranked, "for-you", profile),
  };

  return {
    stories: ranked,
    briefings,
    error: pool.error,
    fromCache: pool.fromCache,
    fetchedAt: pool.fetchedAt,
    intelligenceUpdatedAt:
      snapshot?.updatedAt ??
      meta?.lastSuccessfulRefreshAt ??
      null,
    cacheStatus: pool.status,
    liveDelayed: false,
    fromPersistentStore: pool.fromPersistentStore,
    hasIntelligenceSnapshot: Boolean(snapshot?.updatedAt),
    persistenceConfigured: isRemotePersistenceConfigured(),
    persistenceSource: redisDiag.source,
  };
}

export async function getPersistenceStatus(): Promise<{
  configured: boolean;
  source: string | null;
  pingOk: boolean;
  pingError?: string;
  latencyMs?: number;
}> {
  const diag = getRedisConfigDiagnostics();
  const ping = await pingRedis();
  return {
    configured: diag.configured,
    source: diag.source,
    pingOk: ping.ok,
    pingError: ping.error,
    latencyMs: ping.latencyMs,
  };
}

export type RefreshIntelligenceResult = {
  ok: boolean;
  updatedAt: number;
  storiesCount: number;
  error?: string;
};

type RefreshLock = {
  inflight: Promise<RefreshIntelligenceResult> | null;
};

function getRefreshLock(): RefreshLock {
  const g = globalThis as typeof globalThis & {
    [REFRESH_LOCK_KEY]?: RefreshLock;
  };
  if (!g[REFRESH_LOCK_KEY]) {
    g[REFRESH_LOCK_KEY] = { inflight: null };
  }
  return g[REFRESH_LOCK_KEY];
}

async function runRefresh(
  profile: OnboardingProfile | null
): Promise<RefreshIntelligenceResult> {
  if (!isRemotePersistenceConfigured()) {
    return {
      ok: false,
      updatedAt: Date.now(),
      storiesCount: 0,
      error:
        "Redis/KV is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN before refreshing intelligence.",
    };
  }

  const profileFingerprint = getProfileBriefingFingerprint(profile);

  const ping = await pingRedis();
  if (!ping.ok) {
    return {
      ok: false,
      updatedAt: Date.now(),
      storiesCount: 0,
      error: ping.error ?? "Redis/KV ping failed — cannot persist snapshots",
    };
  }

  await recordRefreshAttempt(profileFingerprint);

  try {
    const pool = await getStoryPool({ forceRefresh: true });

    if (pool.stories.length === 0) {
      return {
        ok: false,
        updatedAt: Date.now(),
        storiesCount: 0,
        error: pool.error ?? "No stories returned from NewsAPI",
      };
    }

    const enrichLimit = profile?.completed
      ? 12
      : profile?.interests?.length
        ? 8
        : 6;
    const enriched = await enrichStories(pool.stories, {
      limit: enrichLimit,
      profile,
    });

    const enrichedBySlug: Record<string, Story> = {};
    for (const story of enriched.slice(0, enrichLimit)) {
      enrichedBySlug[story.slug] = story;
    }

    const [forYouBriefing, globalBriefing] = await Promise.all([
      resolveWeeklyBriefing(enriched, "for-you", profile, { force: true }),
      resolveWeeklyBriefing(enriched, "global", profile, { force: true }),
    ]);

    const updatedAt = Date.now();
    const snapshot: PlatformIntelligenceSnapshot = {
      version: 2,
      updatedAt,
      storiesFetchedAt: pool.fetchedAt,
      profileFingerprint,
      enrichedBySlug,
      briefings: {
        "for-you": forYouBriefing,
        global: globalBriefing,
      },
    };

    const saved = await writePlatformIntelligenceSnapshot(snapshot);
    if (!saved) {
      return {
        ok: false,
        updatedAt,
        storiesCount: pool.stories.length,
        error:
          "Intelligence was generated but could not be saved. Configure Upstash Redis / Vercel KV and try again.",
      };
    }

    return {
      ok: true,
      updatedAt,
      storiesCount: pool.stories.length,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Intelligence refresh failed";
    console.error(`[INTELLIGENCE] Refresh failed — ${message}`);
    return {
      ok: false,
      updatedAt: Date.now(),
      storiesCount: 0,
      error: message,
    };
  }
}

/** Manual refresh only — dedupes concurrent requests to avoid token bleed. */
export async function refreshPlatformIntelligence(
  profile: OnboardingProfile | null
): Promise<RefreshIntelligenceResult> {
  const lock = getRefreshLock();
  if (lock.inflight) {
    return lock.inflight;
  }

  lock.inflight = runRefresh(profile).finally(() => {
    lock.inflight = null;
  });

  return lock.inflight;
}

export async function getEnrichedStoryFromSnapshot(
  slug: string
): Promise<Story | null> {
  const snapshot = await readPlatformIntelligenceSnapshot();
  return snapshot?.enrichedBySlug[slug] ?? null;
}
