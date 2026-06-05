import "server-only";

import { ensureStoryArticleBody } from "@/lib/extraction/resolve-body";
import { createMemoryStore } from "@/lib/cache/memory-store";
import { weeklyBriefingCacheKey } from "@/lib/briefing/cache-key";
import { getProfileBriefingFingerprint } from "@/lib/briefing/profile-fingerprint";
import {
  loadUserIntelligenceSnapshot,
  readCachedBriefing,
} from "@/lib/intelligence/user-intelligence-load";
import {
  getCoveragePeriodFromCorpus,
} from "@/lib/briefing/cadence";
import { buildProvenanceFromSelection } from "@/lib/briefing/provenance";
import { logBriefing } from "@/lib/briefing/briefing-log";
import {
  readPersistedWeeklyBriefing,
  writePersistedWeeklyBriefing,
} from "@/lib/persistence/weekly-briefing-persist";
import { readPlatformIntelligenceSnapshot } from "@/lib/persistence/intelligence-snapshot-persist";
import { auditBriefingCorpusInput, briefingCorpusForCadence } from "@/lib/briefing/briefing-corpus";
import {
  briefingMeetsCorpusThreshold,
  logBriefingProvenance,
} from "@/lib/briefing/briefing-provenance-guard";
import { rejectDuplicateHeadline } from "@/lib/briefing/thesis-title";
import {
  completeBriefingSections,
  deriveGlobalWeeklyImpact,
  deriveGlobalWeeklyOverview,
  deriveWeeklyWatchItems,
  synthesisAuditFromSelection,
} from "@/lib/briefing/briefing-synthesis-fallback";
import { deriveForYouWeeklyImpact } from "@/lib/briefing/for-you-impact";
import { auditBriefingQuality } from "@/lib/briefing/briefing-quality";
import {
  classifyModelError,
  logBriefingFallbackTrigger,
  logBriefingGenerationStart,
  logBriefingLlmSuccess,
  logBriefingOutcome,
  logBriefingVerifyFailure,
  logBriefingVerifySuccess,
  logPreLlmMetrics,
  verifyBriefingOutput,
} from "@/lib/briefing/briefing-generation-audit";
import { auditDailyPipeline } from "@/lib/briefing/daily-pipeline-log";
import { hasEnoughMaterialForBriefing } from "@/lib/briefing/source-material";
import { enrichBriefingSelection } from "@/lib/briefing/enrich-selection";
import { buildWeeklyBriefingPrompt } from "@/lib/briefing/prompts";
import {
  briefingContainsRefusal,
  responseLooksLikeRefusal,
} from "@/lib/intelligence/model-refusal";
import {
  deriveFallbackHeadline,
  deriveFallbackSummary,
} from "@/lib/briefing/format-weekly";
import { formatBriefingForDisplay } from "@/lib/briefing/format-display";
import { deriveKeySignal } from "@/lib/briefing/key-signal";
import { parseWeeklyBriefingResponse } from "@/lib/intelligence/parse-tagged-weekly";
import {
  allStoriesFromSelection,
  selectWeeklyBriefingSelection,
  stripBriefingDiagnostics,
  type BriefingSelectionOptions,
} from "@/lib/briefing/weekly-selection";
import type {
  BriefingCadence,
  BriefingMode,
  IntelligenceBriefing,
} from "@/lib/briefing/types";
import {
  briefingMatchesCadence,
  normalizeBriefing,
} from "@/lib/briefing/shared/normalize";
import {
  callAIJson,
  getAIProvider,
  isAIConfigured,
  isAIFallbackAllowed,
} from "@/lib/intelligence/provider";
import type { OnboardingProfile, Story } from "@/lib/types";
import { briefingIsUserSafe } from "@/lib/briefing/weekly-rescue";

export type {
  BriefingCadence,
  BriefingMode,
  IntelligenceBriefing,
  WeeklyBriefing,
  WeeklyBriefingMode,
} from "@/lib/briefing/types";

const CACHE_TTL_MS = 30 * 60 * 1000;

type BriefingCacheEntry = {
  generatedAt: string;
  briefing: IntelligenceBriefing;
};

const briefingStore = createMemoryStore<BriefingCacheEntry>({
  ttlMs: CACHE_TTL_MS,
  maxEntries: 160,
});

async function readBriefingCache(
  key: string,
  mode: BriefingMode,
  cadence: BriefingCadence
): Promise<IntelligenceBriefing | null> {
  const entry = briefingStore.get(key);
  if (briefingMatchesCadence(entry?.briefing, mode, cadence)) {
    logBriefing(cadence, mode, "cache hit", "memory");
    return normalizeBriefing(entry!.briefing, cadence);
  }

  const persisted = await readPersistedWeeklyBriefing(key);
  if (briefingMatchesCadence(persisted ?? undefined, mode, cadence)) {
    logBriefing(cadence, mode, "cache hit", "persist");
    const normalized = normalizeBriefing(persisted!, cadence);
    briefingStore.set(key, {
      generatedAt: new Date().toISOString(),
      briefing: normalized,
    });
    return normalized;
  }

  logBriefing(cadence, mode, "cache miss");
  return null;
}

async function writeBriefingCache(
  key: string,
  briefing: IntelligenceBriefing
): Promise<void> {
  const normalized = normalizeBriefing(briefing, briefing.cadence);
  briefingStore.set(key, {
    generatedAt: new Date().toISOString(),
    briefing: normalized,
  });
  const ok = await writePersistedWeeklyBriefing(key, normalized);
  logBriefing(
    briefing.cadence,
    briefing.mode,
    ok ? "snapshot write succeeded" : "snapshot write failed",
    `key ${key.slice(0, 48)}`
  );
}

function finalizeBriefing(briefing: IntelligenceBriefing): IntelligenceBriefing {
  return stripBriefingDiagnostics(normalizeBriefing(briefing, briefing.cadence));
}

function attachCoveragePeriod(
  briefing: IntelligenceBriefing,
  corpus: Story[],
  cadence: BriefingCadence
): IntelligenceBriefing {
  const pool = briefingCorpusForCadence(corpus, cadence);
  const { periodLabel, coverageDateMs } = getCoveragePeriodFromCorpus(
    pool,
    cadence
  );
  return {
    ...briefing,
    periodLabel,
    coverageDateMs,
    weekLabel: periodLabel,
  };
}

async function readLastSuccessfulBriefing(
  mode: BriefingMode,
  cadence: BriefingCadence,
  profile: OnboardingProfile | null,
  selection: ReturnType<typeof selectWeeklyBriefingSelection>,
  userId?: string,
  corpusPoolSize?: number
): Promise<IntelligenceBriefing | null> {
  const platform = await readPlatformIntelligenceSnapshot();
  const userSnapshot = userId
    ? await loadUserIntelligenceSnapshot(
        userId,
        getProfileBriefingFingerprint(profile)
      )
    : null;
  const fromStore = readCachedBriefing(mode, cadence, platform, userSnapshot);
  if (
    fromStore &&
    briefingMatchesCadence(fromStore, mode, cadence) &&
    briefingIsUserSafe(fromStore) &&
    !briefingContainsRefusal(fromStore)
  ) {
    const finalized = finalizeBriefing(fromStore);
    if (
      corpusPoolSize !== undefined &&
      !briefingMeetsCorpusThreshold(cadence, finalized, corpusPoolSize)
    ) {
      logBriefingProvenance(
        "snapshot-read-rejected",
        cadence,
        mode,
        finalized,
        corpusPoolSize,
        { reason: "fallback previous below corpus threshold" }
      );
      return null;
    }
    logBriefing(
      cadence,
      mode,
      "fallback to previous",
      mode === "for-you" ? "user snapshot" : "platform snapshot"
    );
    return finalized;
  }

  const cacheKey = weeklyBriefingCacheKey(
    mode,
    profile,
    selection.cacheKeyId,
    cadence
  );
  const cached = await readBriefingCache(cacheKey, mode, cadence);
  if (cached && briefingIsUserSafe(cached) && !briefingContainsRefusal(cached)) {
    if (
      corpusPoolSize !== undefined &&
      !briefingMeetsCorpusThreshold(cadence, cached, corpusPoolSize)
    ) {
      logBriefingProvenance(
        "snapshot-read-rejected",
        cadence,
        mode,
        cached,
        corpusPoolSize,
        { reason: "fallback cache below corpus threshold" }
      );
      return null;
    }
    logBriefing(cadence, mode, "fallback to previous", "persisted cache");
    return cached;
  }

  return null;
}

function logInternalBriefingError(
  cadence: BriefingCadence,
  mode: BriefingMode,
  error: string
): void {
  console.warn(`[WEEKLY_ENGINE] ${cadence}/${mode} — ${error}`);
}

function buildSyncBriefing(
  stories: Story[],
  mode: BriefingMode,
  profile: OnboardingProfile | null,
  cadence: BriefingCadence,
  internalError?: string,
  options?: BriefingSelectionOptions,
  fallbackReason?: Parameters<typeof logBriefingFallbackTrigger>[2]
): IntelligenceBriefing {
  const corpus = options?.corpus ?? stories;
  let selection = enrichBriefingSelection(
    selectWeeklyBriefingSelection(stories, mode, profile, cadence, options),
    { corpus }
  );

  const pool = allStoriesFromSelection(selection);
  auditBriefingCorpusInput(
    selection,
    pool,
    briefingCorpusForCadence(corpus, cadence).length
  );

  logBriefingFallbackTrigger(
    cadence,
    mode,
    fallbackReason ??
      (internalError ? classifyModelError(internalError) : "unknown"),
    internalError ?? "editorial synthesis — no LLM path",
    {
      synthesisStoryCount: pool.length,
      clusterCount: selection.threads.length,
    }
  );

  const provenance = buildProvenanceFromSelection(selection);
  const synthesisAudit = synthesisAuditFromSelection(selection);
  console.log(
    "[BRIEFING_SYNTHESIS_AUDIT]",
    JSON.stringify({
      cadence,
      mode,
      ...synthesisAudit,
      storiesProcessed: pool.length,
    })
  );

  const summary = deriveFallbackSummary(pool, mode, profile, selection);

  if (internalError) {
    logInternalBriefingError(cadence, mode, internalError);
  }

  const fallbackHeadline = deriveFallbackHeadline(
    pool,
    mode,
    profile,
    selection
  );
  const thesisFallback =
    mode === "for-you" && selection
      ? deriveFallbackHeadline(pool, mode, profile, selection)
      : cadence === "weekly"
        ? "A Strategic Pattern Emerged Across The Week"
        : "One Material Change In The Last Day";

  const coverage = getCoveragePeriodFromCorpus(
    briefingCorpusForCadence(corpus, cadence),
    cadence
  );

  const briefing = finalizeBriefing({
    cadence,
    mode,
    periodLabel: coverage.periodLabel,
    coverageDateMs: coverage.coverageDateMs,
    generatedBy: "fallback",
    headline: rejectDuplicateHeadline(fallbackHeadline, thesisFallback),
    summary,
    whatChanged:
      mode === "global"
        ? deriveGlobalWeeklyOverview(selection)
        : deriveFallbackSummary(pool, mode, profile, selection),
    whyYou:
      mode === "for-you"
        ? deriveForYouWeeklyImpact(profile, selection, options?.intelligence)
        : undefined,
    whyItMatters:
      mode === "global" ? deriveGlobalWeeklyImpact(selection) : undefined,
    watchItems: deriveWeeklyWatchItems(selection, mode),
    keySignal: deriveKeySignal(pool),
    provenance,
    invalidateIf:
      mode === "for-you"
        ? "Follow-up data that contradicts the lead facts in any thread."
        : undefined,
    generatedAt: Date.now(),
  });

  briefing.summary = formatBriefingForDisplay(briefing);
  const completed = completeBriefingSections(
    briefing,
    selection,
    profile,
    options?.intelligence
  );
  auditBriefingQuality(completed, selection, profile, options?.intelligence);
  if (completed.generatedBy === "fallback") {
    console.log(
      `[BRIEFING] ${cadence}/${mode} — editorial synthesis (internal only)`
    );
  }
  logBriefingProvenance(
    "generation",
    cadence,
    mode,
    completed,
    briefingCorpusForCadence(corpus, cadence).length,
    { generatedBy: "fallback" }
  );
  logBriefingOutcome("EDITORIAL_FALLBACK", cadence, mode, completed, {
    trigger: fallbackReason ?? internalError,
  });
  return completed;
}

async function buildAIBriefing(
  stories: Story[],
  mode: BriefingMode,
  profile: OnboardingProfile | null,
  cadence: BriefingCadence,
  options?: Pick<
    ResolveWeeklyBriefingOptions,
    "behavioralNote" | "intelligence" | "dailyExclusion" | "corpus"
  >
): Promise<{ briefing: IntelligenceBriefing | null; error?: string }> {
  logBriefingGenerationStart(cadence, mode, true);
  logBriefing(cadence, mode, "generation started");

  const selectionOpts: BriefingSelectionOptions = {
    intelligence: options?.intelligence,
    dailyExclusion: options?.dailyExclusion,
    corpus: options?.corpus,
  };
  const corpus = options?.corpus ?? stories;

  let selection = enrichBriefingSelection(
    selectWeeklyBriefingSelection(
      stories,
      mode,
      profile,
      cadence,
      selectionOpts
    ),
    { corpus }
  );

  const pool = allStoriesFromSelection(selection);
  const corpusPoolSize = briefingCorpusForCadence(corpus, cadence).length;
  auditBriefingCorpusInput(selection, pool, corpusPoolSize);
  const provenance = buildProvenanceFromSelection(selection);

  const withBodies = await Promise.all(
    pool.map((s) => ensureStoryArticleBody(s))
  );

  const selectionWithBodies = {
    ...selection,
    threads: selection.threads.map((thread) => ({
      ...thread,
      stories: thread.stories.map(
        (s) => withBodies.find((b) => b.slug === s.slug) ?? s
      ),
    })),
  };

  const poolWithBodies = allStoriesFromSelection(selectionWithBodies);

  auditBriefingCorpusInput(
    selectionWithBodies,
    poolWithBodies,
    corpusPoolSize
  );
  console.log(
    "[BRIEFING_SYNTHESIS_AUDIT]",
    JSON.stringify({
      cadence,
      mode,
      phase: "pre-llm",
      ...synthesisAuditFromSelection(selectionWithBodies),
    })
  );
  if (cadence === "daily") {
    auditDailyPipeline(selectionWithBodies, poolWithBodies, mode);
  }

  if (!hasEnoughMaterialForBriefing(poolWithBodies, cadence)) {
    const reason =
      poolWithBodies.length === 0
        ? `${cadence}: no stories selected`
        : `${cadence}: insufficient source text for briefing`;
    logBriefingFallbackTrigger(
      cadence,
      mode,
      "insufficient_material",
      reason,
      { storyCount: poolWithBodies.length }
    );
    logBriefing(cadence, mode, "generation skipped", reason);
    logInternalBriefingError(cadence, mode, reason);
    return { briefing: null, error: reason };
  }

  let system: string;
  let user: string;
  try {
    ({ system, user } = buildWeeklyBriefingPrompt(
      selectionWithBodies,
      profile,
      options?.behavioralNote
    ));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Prompt build failed";
    logBriefingFallbackTrigger(
      cadence,
      mode,
      "prompt_build_failed",
      message
    );
    logBriefing(cadence, mode, "generation skipped", message);
    return { briefing: null, error: message };
  }

  const sourceCount = new Set(
    poolWithBodies.map((s) => (s.source || "Unknown").trim())
  ).size;

  logPreLlmMetrics({
    cadence,
    mode,
    promptLength: user.length,
    systemPromptLength: system.length,
    clusterCount: selectionWithBodies.threads.length,
    storyCount: poolWithBodies.length,
    sourceCount,
    corpusPoolSize,
    clusterIds: selectionWithBodies.threads.map((t) => t.clusterId),
  });

  const provider = getAIProvider();
  const coverage = getCoveragePeriodFromCorpus(
    briefingCorpusForCadence(options?.corpus ?? stories, cadence),
    cadence
  );
  const periodLabel = coverage.periodLabel;
  const maxTokens = mode === "for-you" ? 1000 : 780;

  const result = await callAIJson({
    label: `Briefing · ${cadence} · ${mode}`,
    system,
    user,
    temperature: 0.2,
    maxTokens,
    responseFormat: "tags",
    parse: (content) => {
      if (responseLooksLikeRefusal(content)) {
        logBriefing(cadence, mode, "parse refused", "model decline text");
        return null;
      }
      return parseWeeklyBriefingResponse(
        content,
        mode,
        poolWithBodies,
        periodLabel,
        profile,
        cadence,
        provenance
      );
    },
  });

  if (!result.ok) {
    const reason = classifyModelError(result.error);
    logBriefingFallbackTrigger(cadence, mode, reason, result.error, {
      provider,
      promptLength: user.length,
    });
    logBriefing(cadence, mode, "generation failed", result.error);
    console.warn(
      `[${provider.toUpperCase()}] Briefing fallback for ${cadence}/${mode} — ${result.error}`
    );
    return { briefing: null, error: result.error };
  }

  logBriefingLlmSuccess(cadence, mode, {
    provider,
    promptLength: user.length,
    responseHeadline: result.data.headline?.slice(0, 80),
  });

  let briefing = finalizeBriefing({
    ...result.data,
    periodLabel: coverage.periodLabel,
    coverageDateMs: coverage.coverageDateMs,
    provenance,
    generatedAt: Date.now(),
  });

  briefing = completeBriefingSections(
    briefing,
    selectionWithBodies,
    profile,
    options?.intelligence
  );
  auditBriefingQuality(
    briefing,
    selectionWithBodies,
    profile,
    options?.intelligence
  );

  const verification = verifyBriefingOutput(
    briefing,
    mode,
    cadence,
    corpusPoolSize,
    poolWithBodies.length
  );

  if (!verification.ok) {
    logBriefingVerifyFailure(
      cadence,
      mode,
      verification.failedRule ?? "unknown",
      verification.reason ?? "validation_failure",
      verification.detail,
      { synthesisStoryCount: poolWithBodies.length }
    );
    logBriefingFallbackTrigger(
      cadence,
      mode,
      verification.reason ?? "validation_failure",
      verification.detail ?? verification.failedRule ?? "verification failed",
      { failedRule: verification.failedRule }
    );
    return {
      briefing: null,
      error: verification.detail ?? `${cadence} briefing failed verification`,
    };
  }

  logBriefingVerifySuccess(cadence, mode, briefing, poolWithBodies.length);
  logBriefing(cadence, mode, "generation succeeded");
  logBriefingProvenance(
    "generation",
    cadence,
    mode,
    briefing,
    corpusPoolSize,
    { generatedBy: "ai" }
  );
  logBriefingOutcome("LLM_GENERATED", cadence, mode, briefing);
  return { briefing };
}

export type ResolveWeeklyBriefingOptions = {
  force?: boolean;
  cadence?: BriefingCadence;
  behavioralNote?: string;
  intelligence?: BriefingSelectionOptions["intelligence"];
  dailyExclusion?: BriefingSelectionOptions["dailyExclusion"];
  /** Full editorial pool — global briefings cluster against this. */
  corpus?: Story[];
  /** Required for for-you snapshot reads — prevents cross-user briefing leakage. */
  userId?: string;
};

export async function resolveBriefing(
  stories: Story[],
  mode: BriefingMode,
  profile: OnboardingProfile | null,
  options?: ResolveWeeklyBriefingOptions
): Promise<IntelligenceBriefing> {
  const cadence = options?.cadence ?? "weekly";
  const selectionOpts: BriefingSelectionOptions = {
    intelligence: options?.intelligence,
    dailyExclusion: options?.dailyExclusion,
    corpus: options?.corpus,
  };
  const selection = selectWeeklyBriefingSelection(
    stories,
    mode,
    profile,
    cadence,
    selectionOpts
  );
  const cacheKey = weeklyBriefingCacheKey(
    mode,
    profile,
    selection.cacheKeyId,
    cadence
  );

  const corpus = options?.corpus ?? stories;
  const corpusPoolSize = briefingCorpusForCadence(corpus, cadence).length;

  if (!options?.force) {
    logBriefingGenerationStart(cadence, mode, false);
    const platform = await readPlatformIntelligenceSnapshot();
    const userSnapshot =
      mode === "for-you" && options?.userId
        ? await loadUserIntelligenceSnapshot(
            options.userId,
            getProfileBriefingFingerprint(profile)
          )
        : null;
    const cachedBriefing = readCachedBriefing(
      mode,
      cadence,
      platform,
      userSnapshot
    );
    if (briefingMatchesCadence(cachedBriefing, mode, cadence)) {
      if (briefingContainsRefusal(cachedBriefing!)) {
        logBriefing(cadence, mode, "snapshot rejected", "cached model refusal");
      } else if (briefingIsUserSafe(cachedBriefing!)) {
        const finalized = finalizeBriefing(cachedBriefing!);
        if (briefingMeetsCorpusThreshold(cadence, finalized, corpusPoolSize)) {
          logBriefingProvenance(
            "snapshot-read",
            cadence,
            mode,
            finalized,
            corpusPoolSize
          );
          logBriefing(
            cadence,
            mode,
            "snapshot loaded",
            mode === "for-you" ? "user" : "platform"
          );
          logBriefingOutcome("SNAPSHOT_CACHED", cadence, mode, finalized);
          return finalized;
        }
        logBriefingProvenance(
          "snapshot-read-rejected",
          cadence,
          mode,
          finalized,
          corpusPoolSize,
          { reason: "cached briefing below corpus threshold" }
        );
      } else {
        logBriefing(cadence, mode, "snapshot rejected", "invalid briefing content");
      }
    }

    const cached = await readBriefingCache(cacheKey, mode, cadence);
    if (
      cached &&
      briefingIsUserSafe(cached) &&
      briefingMeetsCorpusThreshold(cadence, cached, corpusPoolSize)
    ) {
      logBriefingOutcome("SNAPSHOT_CACHED", cadence, mode, cached, {
        source: "briefing_cache",
      });
      return cached;
    }

    return buildSyncBriefing(
      stories,
      mode,
      profile,
      cadence,
      undefined,
      selectionOpts,
      "unknown"
    );
  }

  logBriefingGenerationStart(cadence, mode, true);

  if (!isAIConfigured()) {
    const provider = getAIProvider();
    const keyName =
      provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
    const offline = buildSyncBriefing(
      stories,
      mode,
      profile,
      cadence,
      `${keyName} is not configured`,
      selectionOpts,
      "ai_not_configured"
    );
    await writeBriefingCache(cacheKey, offline);
    return offline;
  }

  const { briefing: ai, error: aiError } = await buildAIBriefing(
    stories,
    mode,
    profile,
    cadence,
    options
  );
  if (ai && briefingIsUserSafe(ai)) {
    await writeBriefingCache(cacheKey, ai);
    return ai;
  }

  if (ai && !briefingIsUserSafe(ai)) {
    logBriefingFallbackTrigger(
      cadence,
      mode,
      "user_unsafe",
      "AI briefing failed user-safe check after verification"
    );
  }

  const provider = getAIProvider();
  const lastError =
    aiError ??
    `${provider} briefing failed (see server logs for [${provider.toUpperCase()}] lines)`;

  if (lastError) {
    logInternalBriefingError(cadence, mode, lastError);
  }

  const previous = await readLastSuccessfulBriefing(
    mode,
    cadence,
    profile,
    selection,
    options?.userId,
    corpusPoolSize
  );
  if (previous) {
    logBriefingOutcome("PREVIOUS_FALLBACK", cadence, mode, previous, {
      reason: lastError,
    });
    return previous;
  }

  if (!isAIFallbackAllowed()) {
    return buildSyncBriefing(
      stories,
      mode,
      profile,
      cadence,
      lastError,
      selectionOpts,
      classifyModelError(lastError)
    );
  }

  return buildSyncBriefing(
    stories,
    mode,
    profile,
    cadence,
    lastError,
    selectionOpts,
    aiError ? classifyModelError(aiError) : "unknown"
  );
}

/** @deprecated Use resolveBriefing */
export const resolveWeeklyBriefing = resolveBriefing;
