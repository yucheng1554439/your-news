import "server-only";

import { getProfileBriefingFingerprint } from "@/lib/briefing/profile-fingerprint";
import { logBriefing } from "@/lib/briefing/briefing-log";
import { getActiveModel } from "@/lib/intelligence/provider/config";
import {
  resolveBriefing,
  type IntelligenceBriefing,
  type BriefingMode,
} from "@/lib/briefing/weekly-engine";
import type { BriefingCadence, BriefingBundle } from "@/lib/briefing/types";
import {
  briefingMatchesCadence,
  normalizeBriefing,
} from "@/lib/briefing/shared/normalize";
import { briefingIsUserSafe } from "@/lib/briefing/weekly-rescue";
import { buildBehavioralModelNote } from "@/lib/personalization/behavioral-model";
import { formatIntelligenceProfileForPrompt } from "@/lib/personalization/intelligence-profile";
import {
  selectWeeklyBriefingSelection,
} from "@/lib/briefing/weekly-selection";
import { briefingContainsRefusal } from "@/lib/intelligence/model-refusal";
import { briefingCorpusForCadence } from "@/lib/briefing/briefing-corpus";
import { getCoveragePeriodFromCorpus } from "@/lib/briefing/cadence";

function syncBriefingCoverageFromCorpus(
  briefing: IntelligenceBriefing,
  corpus: Story[],
  cadence: BriefingCadence
): IntelligenceBriefing {
  const { periodLabel, coverageDateMs } = getCoveragePeriodFromCorpus(
    briefingCorpusForCadence(corpus, cadence),
    cadence
  );
  return { ...briefing, periodLabel, coverageDateMs, weekLabel: periodLabel };
}
import {
  isGenericBriefingSection,
  isNoDirectImpactText,
} from "@/lib/briefing/shared/impact-fallback";
import { briefingNeedsSectionRepair } from "@/lib/briefing/shared/for-you-sections";
import { repairForYouBriefingSections } from "@/lib/briefing/repair-for-you-sections";
import {
  extractBriefingProvenanceStats,
  briefingMeetsCorpusThreshold,
  logBriefingProvenance,
  logPlatformSnapshotWriteProvenance,
} from "@/lib/briefing/briefing-provenance-guard";
import { buildWeeklyBriefingSync } from "@/lib/weekly-briefing";
import {
  recordRefreshSignalForUser,
  resolveUserBehaviorInputs,
} from "@/lib/services/user-behavior";
import { emptyReadingSignals } from "@/lib/personalization/reading-signals-metadata";
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
  loadUserIntelligenceSnapshot,
  readCachedBriefing,
} from "@/lib/intelligence/user-intelligence-load";
import {
  buildUserIntelligenceSnapshot,
  writeUserIntelligenceSnapshot,
} from "@/lib/persistence/user-intelligence-snapshot-persist";
import { PERSIST_KEYS, userIntelligenceSnapshotKey } from "@/lib/persistence/keys";
import {
  readPlatformIntelligenceSnapshot,
  recordRefreshAttempt,
  writePlatformIntelligenceSnapshot,
  type PlatformIntelligenceSnapshot,
} from "@/lib/persistence/intelligence-snapshot-persist";
import { readPersistedStoryPool } from "@/lib/persistence/story-pool-persist";
import { readIntelligenceMeta } from "@/lib/persistence/intelligence-meta-persist";
import {
  getRedisConfigDiagnostics,
  isRedisConfigured,
  pingRedis,
} from "@/lib/persistence/redis-client";
import { isRemotePersistenceConfigured } from "@/lib/persistence/kv-store";
import type { OnboardingProfile, Story } from "@/lib/types";
import type { StoryPoolStatus } from "@/lib/news/story-pool";
import { auth } from "@clerk/nextjs/server";

function preserveGlobalBriefing(
  cadence: BriefingCadence,
  previous: PlatformIntelligenceSnapshot | null,
  syncFallback: IntelligenceBriefing,
  corpusPoolSize: number
): IntelligenceBriefing {
  const prev = previous?.briefings[cadence]?.global;
  if (prev && briefingIsUserSafe(prev)) {
    const normalized = normalizeBriefing(prev, cadence);
    if (briefingMeetsCorpusThreshold(cadence, normalized, corpusPoolSize)) {
      return normalized;
    }
    logBriefingProvenance(
      "preserve-rejected",
      cadence,
      "global",
      normalized,
      corpusPoolSize,
      { reason: "stale provenance below corpus threshold" }
    );
  }
  logBriefingProvenance(
    "generation",
    cadence,
    "global",
    syncFallback,
    corpusPoolSize,
    { source: "preserveGlobalBriefing-sync" }
  );
  return syncFallback;
}

const REFRESH_LOCK_PREFIX = "__your_news_intelligence_refresh__";

function getRefreshLock(userId: string | null): RefreshLock {
  const lockKey = `${REFRESH_LOCK_PREFIX}:${userId ?? "anon"}`;
  const g = globalThis as typeof globalThis & {
    [key: string]: RefreshLock | undefined;
  };
  if (!g[lockKey]) {
    g[lockKey] = { inflight: null };
  }
  return g[lockKey]!;
}

export type PlatformDashboard = {
  stories: Story[];
  /** Full editorial-ranked pool — always >= For You subset breadth. */
  globalStories: Story[];
  userIntelligence: UserIntelligenceProfile | null;
  briefings: BriefingBundle;
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
  platformSnapshot: PlatformIntelligenceSnapshot | null,
  userSnapshot: Awaited<ReturnType<typeof loadUserIntelligenceSnapshot>>,
  stories: Story[],
  mode: BriefingMode,
  profile: OnboardingProfile | null,
  cadence: BriefingCadence,
  corpus: Story[],
  userIntelligence?: UserIntelligenceProfile | null
): IntelligenceBriefing {
  const cached = readCachedBriefing(
    mode,
    cadence,
    platformSnapshot,
    userSnapshot
  );
  if (briefingMatchesCadence(cached, mode, cadence)) {
    const corpusPoolSize = briefingCorpusForCadence(corpus, cadence).length;
    if (briefingContainsRefusal(cached!)) {
      logBriefing(cadence, mode, "snapshot rejected", "cached model refusal");
      const regenerated = buildWeeklyBriefingSync(stories, mode, profile, cadence, {
        corpus,
      });
      logBriefingProvenance(
        "generation",
        cadence,
        mode,
        regenerated,
        corpusPoolSize,
        { source: "snapshot-read-refusal" }
      );
      return regenerated;
    }
    if (!briefingIsUserSafe(cached!)) {
      logBriefing(cadence, mode, "snapshot rejected", "invalid briefing content");
      const regenerated = buildWeeklyBriefingSync(stories, mode, profile, cadence, {
        corpus,
      });
      logBriefingProvenance(
        "generation",
        cadence,
        mode,
        regenerated,
        corpusPoolSize,
        { source: "snapshot-read-unsafe" }
      );
      return regenerated;
    }
    const normalized = normalizeBriefing(cached!, cadence);
    const stats = extractBriefingProvenanceStats(normalized);
    const staleGenericForYou =
      mode === "for-you" &&
      (briefingNeedsSectionRepair(normalized) ||
        (stats.storiesProcessed > 5 &&
          (isNoDirectImpactText(normalized.whyYou) ||
            isGenericBriefingSection(normalized.whyYou) ||
            isGenericBriefingSection(normalized.whatChanged))));
    if (staleGenericForYou) {
      logBriefing(
        cadence,
        mode,
        "snapshot rejected",
        "generic placeholder sections in cached briefing"
      );
      const regenerated = buildWeeklyBriefingSync(stories, mode, profile, cadence, {
        corpus,
      });
      logBriefingProvenance(
        "generation",
        cadence,
        mode,
        regenerated,
        corpusPoolSize,
        { source: "snapshot-read-generic-regenerate" }
      );
      return regenerated;
    }
    if (!briefingMeetsCorpusThreshold(cadence, normalized, corpusPoolSize)) {
      logBriefingProvenance(
        "snapshot-read-rejected",
        cadence,
        mode,
        normalized,
        corpusPoolSize,
        { reason: "stale provenance below corpus threshold" }
      );
      const regenerated = buildWeeklyBriefingSync(stories, mode, profile, cadence, {
        corpus,
      });
      logBriefingProvenance(
        "generation",
        cadence,
        mode,
        regenerated,
        corpusPoolSize,
        { source: "snapshot-read-regenerate" }
      );
      return regenerated;
    }
    logBriefingProvenance("snapshot-read", cadence, mode, normalized, corpusPoolSize);
    logBriefing(cadence, mode, "snapshot loaded", "dashboard");

    if (mode === "for-you" && profile) {
      const selection = selectWeeklyBriefingSelection(
        stories,
        "for-you",
        profile,
        cadence,
        { corpus, intelligence: userIntelligence }
      );
      return syncBriefingCoverageFromCorpus(
        repairForYouBriefingSections(
          normalized,
          selection,
          profile,
          userIntelligence
        ),
        corpus,
        cadence
      );
    }

    return syncBriefingCoverageFromCorpus(normalized, corpus, cadence);
  }

  const corpusPoolSize = briefingCorpusForCadence(corpus, cadence).length;
  const sync = buildWeeklyBriefingSync(stories, mode, profile, cadence, {
    corpus,
    intelligence: userIntelligence,
  });
  logBriefingProvenance("generation", cadence, mode, sync, corpusPoolSize, {
    source: "snapshot-miss",
  });
  return sync;
}

export async function loadPlatformDashboard(
  profile: OnboardingProfile | null,
  options?: { userId?: string }
): Promise<PlatformDashboard> {
  const pool = await getStoryPool();
  const snapshot = await readPlatformIntelligenceSnapshot();
  const meta = await readIntelligenceMeta();
  const redisDiag = getRedisConfigDiagnostics();
  const profileFingerprint = getProfileBriefingFingerprint(profile);
  const userSnapshot = await loadUserIntelligenceSnapshot(
    options?.userId,
    profileFingerprint
  );

  const merged = enrichStoryTagsBatch(
    mergeEnrichedStories(pool.stories, snapshot?.enrichedBySlug ?? {})
  );

  const { savedRefs, reading } = await resolveUserBehaviorInputs(
    profile,
    options?.userId
  );

  const userIntelligence =
    profile?.completed && reading
      ? buildUserIntelligenceOrNull(profile, savedRefs, reading, merged)
      : null;

  const rankedPersonal = profile?.completed
    ? rankStoriesForUser(merged, profile, userIntelligence, reading)
    : merged;
  const rankedGlobal = rankStoriesGlobal(merged);

  const briefings: BriefingBundle = {
    global: briefingForMode(
      snapshot,
      userSnapshot,
      rankedGlobal,
      "global",
      profile,
      "daily",
      merged,
      userIntelligence
    ),
    "for-you": briefingForMode(
      snapshot,
      userSnapshot,
      rankedPersonal,
      "for-you",
      profile,
      "daily",
      merged,
      userIntelligence
    ),
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
      briefings.global?.generatedAt ??
      briefings["for-you"]?.generatedAt ??
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
  storiesAdded: number;
  storyIntelligenceCount?: number;
  briefingUpdated: boolean;
  signalsUpdated: boolean;
  error?: string;
};

type RefreshLock = {
  inflight: Promise<RefreshIntelligenceResult> | null;
};

async function runRefresh(
  profile: OnboardingProfile | null,
  userId?: string | null
): Promise<RefreshIntelligenceResult> {
  const failure = (
    error: string,
    partial?: Partial<RefreshIntelligenceResult>
  ): RefreshIntelligenceResult => ({
    ok: false,
    updatedAt: Date.now(),
    storiesCount: 0,
    storiesAdded: 0,
    briefingUpdated: false,
    signalsUpdated: false,
    error,
    ...partial,
  });

  if (!isRemotePersistenceConfigured()) {
    return failure(
      "Redis/KV is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN before refreshing intelligence."
    );
  }

  const profileFingerprint = getProfileBriefingFingerprint(profile);

  const ping = await pingRedis();
  if (!ping.ok) {
    return failure(
      ping.error ?? "Redis/KV ping failed — cannot persist snapshots"
    );
  }

  await recordRefreshAttempt(profileFingerprint);

  try {
    const previousSnapshot = await readPlatformIntelligenceSnapshot();
    const previousUserSnapshot = userId
      ? await loadUserIntelligenceSnapshot(userId, profileFingerprint)
      : null;
    const prevPool = await readPersistedStoryPool();
    const prevSlugSet = new Set(
      (prevPool?.stories ?? []).map((s) => s.slug)
    );

    const pool = await getStoryPool({ forceRefresh: true });

    if (pool.stories.length === 0) {
      return failure(pool.error ?? "No stories returned from NewsAPI");
    }

    const storiesAdded = pool.stories.filter(
      (s) => !prevSlugSet.has(s.slug)
    ).length;

    const tagged = enrichStoryTagsBatch(pool.stories);
    const rankedBase = applyEditorialCognition(tagged);

    const now = Date.now();

    const { savedRefs, reading } = await resolveUserBehaviorInputs(
      profile,
      userId
    );
    const readingSignals = reading ?? emptyReadingSignals();

    const intelligence = buildUserIntelligenceOrNull(
      profile,
      savedRefs,
      readingSignals,
      rankedBase
    );

    const rankedPersonal =
      profile?.completed
        ? rankStoriesForUser(rankedBase, profile, intelligence, readingSignals)
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

    console.log(
      userId
        ? "[INTELLIGENCE] user refresh — for-you briefings + story intelligence (global briefings preserved)"
        : "[INTELLIGENCE] platform refresh — briefings then story intelligence batch"
    );

    const dailyForYou = await resolveBriefing(rankedPersonal, "for-you", profile, {
      force: true,
      cadence: "daily",
      behavioralNote,
      intelligence,
      corpus: rankedBase,
      userId: userId ?? undefined,
    });

    const dailyGlobal = userId
      ? null
      : await resolveBriefing(rankedGlobal, "global", profile, {
          force: true,
          cadence: "daily",
          behavioralNote,
          intelligence,
          corpus: rankedBase,
        });

    const dailyCorpusPool = briefingCorpusForCadence(rankedBase, "daily").length;

    const pickBriefingForSnapshot = (
      mode: "for-you" | "global",
      generated: Awaited<ReturnType<typeof resolveBriefing>>,
      syncFallback: IntelligenceBriefing
    ) => {
      if (
        briefingIsUserSafe(generated) &&
        briefingMeetsCorpusThreshold("daily", generated, dailyCorpusPool)
      ) {
        logBriefingProvenance("generation", "daily", mode, generated, dailyCorpusPool, {
          source: "refresh-generated",
        });
        return generated;
      }

      if (briefingIsUserSafe(generated)) {
        logBriefingProvenance(
          "snapshot-read-rejected",
          "daily",
          mode,
          generated,
          dailyCorpusPool,
          { reason: "generated briefing below corpus threshold" }
        );
      }

      const prev =
        mode === "for-you"
          ? previousUserSnapshot?.briefings.daily?.["for-you"]
          : previousSnapshot?.briefings.daily?.global;
      if (prev && briefingIsUserSafe(prev)) {
        const normalized = normalizeBriefing(prev, "daily");
        if (briefingMeetsCorpusThreshold("daily", normalized, dailyCorpusPool)) {
          console.warn(
            `[WEEKLY_ENGINE] refresh kept previous daily/${mode} — generated briefing was invalid`
          );
          logBriefingProvenance("snapshot-read", "daily", mode, normalized, dailyCorpusPool, {
            source: "refresh-kept-prev",
          });
          return normalized;
        }
        logBriefingProvenance(
          "preserve-rejected",
          "daily",
          mode,
          normalized,
          dailyCorpusPool,
          { reason: "previous snapshot below corpus threshold" }
        );
      }

      logBriefingProvenance("generation", "daily", mode, syncFallback, dailyCorpusPool, {
        source: "refresh-sync-fallback",
      });
      return syncFallback;
    };

    const dailyGlobalSync = buildWeeklyBriefingSync(
      rankedGlobal,
      "global",
      profile,
      "daily",
      { corpus: rankedBase }
    );
    const dailyForYouSync = buildWeeklyBriefingSync(
      rankedPersonal,
      "for-you",
      profile,
      "daily",
      { corpus: rankedBase }
    );

    const safeDailyForYou = pickBriefingForSnapshot(
      "for-you",
      dailyForYou,
      dailyForYouSync
    );
    const safeDailyGlobal = userId
      ? preserveGlobalBriefing(
          "daily",
          previousSnapshot,
          dailyGlobalSync,
          dailyCorpusPool
        )
      : pickBriefingForSnapshot("global", dailyGlobal!, dailyGlobalSync);

    const briefingSelections = [dailyForYouSel, dailyGlobalSel];

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

    if (userId) {
      void recordRefreshSignalForUser(userId);
    }

    const mergedEnriched = {
      ...(previousSnapshot?.enrichedBySlug ?? {}),
      ...enrichedBySlug,
    };

    const globalSnapshot: PlatformIntelligenceSnapshot = {
      version: 4,
      aiModel: getActiveModel(),
      updatedAt: now,
      storiesFetchedAt: pool.fetchedAt,
      profileFingerprint: "global",
      enrichedBySlug: mergedEnriched,
      cadenceUpdatedAt: {
        daily: now,
        weekly: 0,
      },
      briefings: {
        daily: { global: safeDailyGlobal },
        weekly: {},
      },
    };

    const keysWritten: string[] = [PERSIST_KEYS.intelligenceSnapshot];

    logPlatformSnapshotWriteProvenance(globalSnapshot, rankedBase);

    const globalSaved = await writePlatformIntelligenceSnapshot(globalSnapshot);
    if (!globalSaved) {
      return failure(
        "Intelligence was generated but could not be saved. Configure Upstash Redis / Vercel KV and try again.",
        {
          updatedAt: now,
          storiesCount: pool.stories.length,
          storiesAdded,
        }
      );
    }

    console.log(
      `[SNAPSHOT_SCOPE] global key=${PERSIST_KEYS.intelligenceSnapshot}`
    );

    if (userId) {
      logBriefingProvenance(
        "snapshot-write",
        "daily",
        "for-you",
        safeDailyForYou,
        dailyCorpusPool
      );

      const userSaved = await writeUserIntelligenceSnapshot(
        buildUserIntelligenceSnapshot({
          userId,
          profileFingerprint,
          updatedAt: now,
          forYou: safeDailyForYou,
        })
      );
      if (!userSaved) {
        return failure(
          "Personal briefings could not be saved to your profile.",
          {
            updatedAt: now,
            storiesCount: pool.stories.length,
            storiesAdded,
          }
        );
      }
      keysWritten.push(userIntelligenceSnapshotKey(userId));
    }

    console.log(
      "[REFRESH_INTELLIGENCE]",
      JSON.stringify({
        userId: userId ?? null,
        keysWritten,
        keysInvalidated: [],
      })
    );

    return {
      ok: true,
      updatedAt: now,
      storiesCount: pool.stories.length,
      storiesAdded,
      storyIntelligenceCount,
      briefingUpdated: true,
      signalsUpdated: true,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Intelligence refresh failed";
    console.error(`[INTELLIGENCE] Refresh failed — ${message}`);
    return failure(message);
  }
}

/** Manual refresh — dedupes concurrent requests; same workflow as web Refresh Intelligence. */
export async function refreshPlatformIntelligence(
  profile: OnboardingProfile | null,
  options?: { userId?: string | null }
): Promise<RefreshIntelligenceResult> {
  let userId = options?.userId;
  if (userId === undefined) {
    const session = await auth();
    userId = session.userId;
  }

  const lock = getRefreshLock(userId ?? null);
  if (lock.inflight) {
    return lock.inflight;
  }

  lock.inflight = runRefresh(profile, userId).finally(() => {
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
