import "server-only";

import { getProfileBriefingFingerprint } from "@/lib/briefing/profile-fingerprint";
import { logBriefing } from "@/lib/briefing/briefing-log";
import { getActiveModel } from "@/lib/intelligence/provider/config";
import {
  resolveBriefing,
  type IntelligenceBriefing,
  type BriefingMode,
} from "@/lib/briefing/weekly-engine";
import type { BriefingCadence, CadenceBriefings } from "@/lib/briefing/types";
import {
  briefingMatchesCadence,
  normalizeBriefing,
} from "@/lib/briefing/types";
import { briefingIsUserSafe } from "@/lib/briefing/weekly-rescue";
import { buildBehavioralModelNote } from "@/lib/personalization/behavioral-model";
import { formatIntelligenceProfileForPrompt } from "@/lib/personalization/intelligence-profile";
import {
  buildDailyExclusion,
  selectWeeklyBriefingSelection,
} from "@/lib/briefing/weekly-selection";
import { briefingContainsRefusal } from "@/lib/intelligence/model-refusal";
import { buildWeeklyBriefingSync } from "@/lib/weekly-briefing";
import { getSavedStoriesFromClerk } from "@/app/actions/saved-stories";
import {
  getReadingSignalsFromClerk,
  recordIntelligenceRefreshForUser,
} from "@/app/actions/reading-signals";
import { getStoryPool } from "@/lib/news/story-pool";
import { applyEditorialCognition } from "@/lib/editorial/apply-cognition";
import { batchEnrichStoriesForSnapshot } from "@/lib/intelligence/batch-story-intelligence";
import { selectStoryIntelligenceTargets } from "@/lib/intelligence/story-snapshot-targets";
import { enrichStoryTagsBatch } from "@/lib/intelligence/story-tags";
import {
  auditHomepagePlacements,
  logHomepageRankAudit,
} from "@/lib/ranking/explain";
import { mergeStoryIntelligenceSafely } from "@/lib/intelligence/provenance";
import { rankStoriesForUser, rankStoriesGlobal } from "@/lib/personalization/engine";
import { buildUserIntelligenceOrNull } from "@/lib/personalization/resolve-user-intelligence";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
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
import type { OnboardingProfile, Story } from "@/lib/types";
import type { StoryPoolStatus } from "@/lib/news/story-pool";

const REFRESH_LOCK_KEY = "__your_news_intelligence_refresh__";

export type PlatformDashboard = {
  stories: Story[];
  /** Full editorial-ranked pool — always >= For You subset breadth. */
  globalStories: Story[];
  userIntelligence: UserIntelligenceProfile | null;
  briefings: CadenceBriefings;
  error: string | null;
  fromCache: boolean;
  fetchedAt: number;
  intelligenceUpdatedAt: number | null;
  cadenceUpdatedAt: PlatformIntelligenceSnapshot["cadenceUpdatedAt"] | null;
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
    return mergeStoryIntelligenceSafely(
      story,
      enriched,
      "platform-snapshot merge"
    );
  });
}

function briefingForMode(
  snapshot: PlatformIntelligenceSnapshot | null,
  stories: Story[],
  mode: BriefingMode,
  profile: OnboardingProfile | null,
  cadence: BriefingCadence,
  corpus: Story[]
): IntelligenceBriefing {
  const cached = snapshot?.briefings?.[cadence]?.[mode];
  if (briefingMatchesCadence(cached, mode, cadence)) {
    if (briefingContainsRefusal(cached!)) {
      logBriefing(cadence, mode, "snapshot rejected", "cached model refusal");
      return buildWeeklyBriefingSync(stories, mode, profile, cadence, {
        corpus,
      });
    }
    if (!briefingIsUserSafe(cached!)) {
      logBriefing(cadence, mode, "snapshot rejected", "invalid briefing content");
      return buildWeeklyBriefingSync(stories, mode, profile, cadence, {
        corpus,
      });
    }
    logBriefing(cadence, mode, "snapshot loaded", "dashboard");
    return normalizeBriefing(cached!, cadence);
  }

  return buildWeeklyBriefingSync(stories, mode, profile, cadence, { corpus });
}

export async function loadPlatformDashboard(
  profile: OnboardingProfile | null
): Promise<PlatformDashboard> {
  const pool = await getStoryPool();
  const snapshot = await readPlatformIntelligenceSnapshot();
  const meta = await readIntelligenceMeta();
  const redisDiag = getRedisConfigDiagnostics();

  const merged = enrichStoryTagsBatch(
    mergeEnrichedStories(pool.stories, snapshot?.enrichedBySlug ?? {})
  );

  const savedRefs = profile?.completed ? await getSavedStoriesFromClerk() : [];
  const reading = profile?.completed
    ? await getReadingSignalsFromClerk()
    : null;

  const userIntelligence =
    profile?.completed && reading
      ? buildUserIntelligenceOrNull(profile, savedRefs, reading, merged)
      : null;

  const rankedPersonal = profile?.completed
    ? rankStoriesForUser(merged, profile, userIntelligence, reading)
    : merged;
  const rankedGlobal = rankStoriesGlobal(merged);

  const briefings: CadenceBriefings = {
    daily: {
      global: briefingForMode(
        snapshot,
        rankedGlobal,
        "global",
        profile,
        "daily",
        merged
      ),
      "for-you": briefingForMode(
        snapshot,
        rankedPersonal,
        "for-you",
        profile,
        "daily",
        merged
      ),
    },
    weekly: {
      global: briefingForMode(
        snapshot,
        rankedGlobal,
        "global",
        profile,
        "weekly",
        merged
      ),
      "for-you": briefingForMode(
        snapshot,
        rankedPersonal,
        "for-you",
        profile,
        "weekly",
        merged
      ),
    },
  };

  if (profile?.completed) {
    const audits = auditHomepagePlacements(
      rankedPersonal,
      rankedGlobal,
      profile,
      userIntelligence
    );
    if (
      process.env.NODE_ENV === "development" ||
      process.env.DEBUG_RANKING === "1"
    ) {
      logHomepageRankAudit(audits);
    }
  }

  return {
    stories: rankedPersonal,
    globalStories: rankedGlobal,
    userIntelligence,
    briefings,
    error: pool.error,
    fromCache: pool.fromCache,
    fetchedAt: pool.fetchedAt,
    intelligenceUpdatedAt:
      snapshot?.updatedAt ??
      meta?.lastSuccessfulRefreshAt ??
      null,
    cadenceUpdatedAt: snapshot?.cadenceUpdatedAt ?? null,
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
  storyIntelligenceCount?: number;
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
    const previousSnapshot = await readPlatformIntelligenceSnapshot();

    const pool = await getStoryPool({ forceRefresh: true });

    if (pool.stories.length === 0) {
      return {
        ok: false,
        updatedAt: Date.now(),
        storiesCount: 0,
        error: pool.error ?? "No stories returned from NewsAPI",
      };
    }

    const tagged = enrichStoryTagsBatch(pool.stories);
    const rankedBase = applyEditorialCognition(tagged);

    const now = Date.now();

    const savedRefs = await getSavedStoriesFromClerk();
    const reading = await getReadingSignalsFromClerk();

    const intelligence = buildUserIntelligenceOrNull(
      profile,
      savedRefs,
      reading,
      rankedBase
    );

    const rankedPersonal =
      profile?.completed
        ? rankStoriesForUser(rankedBase, profile, intelligence, reading)
        : rankedBase;
    const rankedGlobal = rankStoriesGlobal(rankedBase);

    const behavioralNote = intelligence
      ? formatIntelligenceProfileForPrompt(intelligence)
      : profile?.completed
        ? buildBehavioralModelNote(profile, savedRefs, rankedBase)
        : undefined;

    const selectionOpts = { intelligence, corpus: rankedBase };

    const dailyForYouSel = selectWeeklyBriefingSelection(
      rankedPersonal,
      "for-you",
      profile,
      "daily",
      selectionOpts
    );
    const dailyGlobalSel = selectWeeklyBriefingSelection(
      rankedGlobal,
      "global",
      profile,
      "daily",
      selectionOpts
    );
    const dailyExclusion = buildDailyExclusion([
      dailyForYouSel,
      dailyGlobalSel,
    ]);

    console.log(
      "[INTELLIGENCE] manual refresh — briefings then story intelligence batch"
    );

    const [dailyForYou, dailyGlobal] = await Promise.all([
      resolveBriefing(rankedPersonal, "for-you", profile, {
        force: true,
        cadence: "daily",
        behavioralNote,
        intelligence,
        corpus: rankedBase,
      }),
      resolveBriefing(rankedGlobal, "global", profile, {
        force: true,
        cadence: "daily",
        behavioralNote,
        intelligence,
        corpus: rankedBase,
      }),
    ]);

    const weeklyForYouSel = selectWeeklyBriefingSelection(
      rankedPersonal,
      "for-you",
      profile,
      "weekly",
      { ...selectionOpts, dailyExclusion: buildDailyExclusion([dailyForYouSel, dailyGlobalSel]) }
    );
    const weeklyGlobalSel = selectWeeklyBriefingSelection(
      rankedGlobal,
      "global",
      profile,
      "weekly",
      { ...selectionOpts, dailyExclusion: buildDailyExclusion([dailyForYouSel, dailyGlobalSel]) }
    );

    const [weeklyForYou, weeklyGlobal] = await Promise.all([
      resolveBriefing(rankedPersonal, "for-you", profile, {
        force: true,
        cadence: "weekly",
        behavioralNote,
        intelligence,
        dailyExclusion,
        corpus: rankedBase,
      }),
      resolveBriefing(rankedGlobal, "global", profile, {
        force: true,
        cadence: "weekly",
        behavioralNote,
        intelligence,
        dailyExclusion,
        corpus: rankedBase,
      }),
    ]);

    const pickBriefingForSnapshot = (
      cadence: "daily" | "weekly",
      mode: "for-you" | "global",
      generated: Awaited<ReturnType<typeof resolveBriefing>>
    ) => {
      if (briefingIsUserSafe(generated)) return generated;
      const prev = previousSnapshot?.briefings?.[cadence]?.[mode];
      if (prev && briefingIsUserSafe(prev)) {
        console.warn(
          `[WEEKLY_ENGINE] refresh kept previous ${cadence}/${mode} — generated briefing was invalid`
        );
        return normalizeBriefing(prev, cadence);
      }
      return generated;
    };

    const safeDailyForYou = pickBriefingForSnapshot("daily", "for-you", dailyForYou);
    const safeDailyGlobal = pickBriefingForSnapshot("daily", "global", dailyGlobal);
    const safeWeeklyForYou = pickBriefingForSnapshot("weekly", "for-you", weeklyForYou);
    const safeWeeklyGlobal = pickBriefingForSnapshot("weekly", "global", weeklyGlobal);

    const briefingSelections = [
      dailyForYouSel,
      dailyGlobalSel,
      weeklyForYouSel,
      weeklyGlobalSel,
    ];

    const storyTargets = selectStoryIntelligenceTargets(
      rankedBase,
      profile,
      savedRefs.map((r) => r.slug),
      briefingSelections,
      intelligence,
      30
    );

    const savedSlugs = savedRefs.map((r) => r.slug);
    const { enrichedBySlug, generated: storyIntelligenceCount } =
      await batchEnrichStoriesForSnapshot(
        storyTargets,
        profile,
        rankedBase,
        savedSlugs
      );

    void recordIntelligenceRefreshForUser();

    const snapshot: PlatformIntelligenceSnapshot = {
      version: 4,
      aiModel: getActiveModel(),
      updatedAt: now,
      storiesFetchedAt: pool.fetchedAt,
      profileFingerprint,
      enrichedBySlug,
      cadenceUpdatedAt: {
        daily: now,
        weekly: now,
      },
      briefings: {
        daily: { "for-you": safeDailyForYou, global: safeDailyGlobal },
        weekly: { "for-you": safeWeeklyForYou, global: safeWeeklyGlobal },
      },
    };

    const saved = await writePlatformIntelligenceSnapshot(snapshot);
    if (!saved) {
      return {
        ok: false,
        updatedAt: now,
        storiesCount: pool.stories.length,
        error:
          "Intelligence was generated but could not be saved. Configure Upstash Redis / Vercel KV and try again.",
      };
    }

    return {
      ok: true,
      updatedAt: now,
      storiesCount: pool.stories.length,
      storyIntelligenceCount,
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

/** Manual refresh — dedupes concurrent requests; regenerates only stale cadences. */
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
