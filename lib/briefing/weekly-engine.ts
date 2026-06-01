import "server-only";

import { ensureStoryArticleBody } from "@/lib/extraction/resolve-body";
import { createMemoryStore } from "@/lib/cache/memory-store";
import { weeklyBriefingCacheKey } from "@/lib/briefing/cache-key";
import { getPeriodLabel } from "@/lib/briefing/cadence";
import { buildProvenanceFromSelection } from "@/lib/briefing/provenance";
import { logBriefing } from "@/lib/briefing/briefing-log";
import {
  readPersistedWeeklyBriefing,
  writePersistedWeeklyBriefing,
} from "@/lib/persistence/weekly-briefing-persist";
import { readPlatformIntelligenceSnapshot } from "@/lib/persistence/intelligence-snapshot-persist";
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
  ensureBriefingSelectionMaterial,
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
} from "@/lib/briefing/types";
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

async function readLastSuccessfulBriefing(
  mode: BriefingMode,
  cadence: BriefingCadence,
  profile: OnboardingProfile | null,
  selection: ReturnType<typeof selectWeeklyBriefingSelection>
): Promise<IntelligenceBriefing | null> {
  const platform = await readPlatformIntelligenceSnapshot();
  const fromPlatform = platform?.briefings?.[cadence]?.[mode];
  if (
    briefingMatchesCadence(fromPlatform, mode, cadence) &&
    briefingIsUserSafe(fromPlatform!) &&
    !briefingContainsRefusal(fromPlatform!)
  ) {
    logBriefing(cadence, mode, "fallback to previous", "platform snapshot");
    return finalizeBriefing(fromPlatform!);
  }

  const cacheKey = weeklyBriefingCacheKey(
    mode,
    profile,
    selection.cacheKeyId,
    cadence
  );
  const cached = await readBriefingCache(cacheKey, mode, cadence);
  if (cached && briefingIsUserSafe(cached) && !briefingContainsRefusal(cached)) {
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
  options?: BriefingSelectionOptions
): IntelligenceBriefing {
  const corpus = options?.corpus ?? stories;
  let selection = enrichBriefingSelection(
    selectWeeklyBriefingSelection(stories, mode, profile, cadence, options),
    { corpus }
  );

  const ensured = ensureBriefingSelectionMaterial(
    selection,
    corpus,
    mode,
    profile,
    cadence === "daily" ? 1 : 2
  );
  if (ensured.rescueApplied) {
    selection = enrichBriefingSelection(ensured.selection, { corpus });
  } else {
    selection = ensured.selection;
  }

  const pool = allStoriesFromSelection(selection);
  const provenance = buildProvenanceFromSelection(selection);
  const summary = deriveFallbackSummary(pool, mode, profile, selection);

  if (internalError) {
    logInternalBriefingError(cadence, mode, internalError);
  }

  const briefing = finalizeBriefing({
    cadence,
    mode,
    periodLabel: getPeriodLabel(cadence),
    generatedBy: "fallback",
    headline: deriveFallbackHeadline(pool, mode, profile, selection),
    summary,
    whatChanged: summary.split("\n\n")[0],
    keySignal: deriveKeySignal(pool),
    provenance,
    decisions:
      mode === "for-you"
        ? "Review exposure and timing against the threads above before acting."
        : undefined,
    invalidateIf:
      mode === "for-you"
        ? "Follow-up data that contradicts the lead facts in any thread."
        : undefined,
    generatedAt: Date.now(),
  });

  briefing.summary = formatBriefingForDisplay(briefing);
  return briefing;
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

  const ensured = ensureBriefingSelectionMaterial(
    selection,
    corpus,
    mode,
    profile,
    cadence === "daily" ? 1 : 2
  );
  if (ensured.rescueApplied) {
    selection = enrichBriefingSelection(ensured.selection, { corpus });
  } else {
    selection = ensured.selection;
  }

  const pool = allStoriesFromSelection(selection);
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

  if (cadence === "daily") {
    auditDailyPipeline(selectionWithBodies, poolWithBodies, mode);
  }

  if (!hasEnoughMaterialForBriefing(poolWithBodies, cadence)) {
    const reason =
      poolWithBodies.length === 0
        ? `${cadence}: no stories selected`
        : `${cadence}: insufficient source text for briefing`;
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
    logBriefing(cadence, mode, "generation skipped", message);
    return { briefing: null, error: message };
  }

  const provider = getAIProvider();
  const periodLabel = getPeriodLabel(cadence);
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
    logBriefing(cadence, mode, "generation failed", result.error);
    console.warn(
      `[${provider.toUpperCase()}] Briefing fallback for ${cadence}/${mode} — ${result.error}`
    );
    return { briefing: null, error: result.error };
  }

  const briefing = finalizeBriefing({
    ...result.data,
    provenance,
    generatedAt: Date.now(),
  });

  if (briefingContainsRefusal(briefing)) {
    logBriefing(cadence, mode, "generation refused", "model decline in briefing");
    return {
      briefing: null,
      error: "Model declined to synthesize (insufficient context or refusal)",
    };
  }

  if (!briefingMatchesCadence(briefing, mode, cadence)) {
    return {
      briefing: null,
      error: `${provider} returned wrong briefing mode/cadence`,
    };
  }

  logBriefing(cadence, mode, "generation succeeded");
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

  if (!options?.force) {
    const platform = await readPlatformIntelligenceSnapshot();
    const platformBriefing = platform?.briefings?.[cadence]?.[mode];
    if (briefingMatchesCadence(platformBriefing, mode, cadence)) {
      if (briefingContainsRefusal(platformBriefing!)) {
        logBriefing(cadence, mode, "snapshot rejected", "cached model refusal");
      } else if (briefingIsUserSafe(platformBriefing!)) {
        logBriefing(cadence, mode, "snapshot loaded", "platform");
        return finalizeBriefing(platformBriefing!);
      } else {
        logBriefing(cadence, mode, "snapshot rejected", "invalid briefing content");
      }
    }

    const cached = await readBriefingCache(cacheKey, mode, cadence);
    if (cached && briefingIsUserSafe(cached)) return cached;

    return buildSyncBriefing(stories, mode, profile, cadence, undefined, selectionOpts);
  }

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
      selectionOpts
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
    selection
  );
  if (previous) {
    return previous;
  }

  if (!isAIFallbackAllowed()) {
    return buildSyncBriefing(
      stories,
      mode,
      profile,
      cadence,
      lastError,
      selectionOpts
    );
  }

  return buildSyncBriefing(
    stories,
    mode,
    profile,
    cadence,
    lastError,
    selectionOpts
  );
}

/** @deprecated Use resolveBriefing */
export const resolveWeeklyBriefing = resolveBriefing;
