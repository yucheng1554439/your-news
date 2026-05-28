import "server-only";

import { ensureStoryArticleBody } from "@/lib/extraction/resolve-body";
import { createMemoryStore } from "@/lib/cache/memory-store";
import { weeklyBriefingCacheKey } from "@/lib/briefing/cache-key";
import {
  readPersistedWeeklyBriefing,
  writePersistedWeeklyBriefing,
} from "@/lib/persistence/weekly-briefing-persist";
import { readPlatformIntelligenceSnapshot } from "@/lib/persistence/intelligence-snapshot-persist";
import { buildWeeklyBriefingPrompt } from "@/lib/briefing/prompts";
import {
  deriveFallbackHeadline,
  deriveFallbackSummary,
} from "@/lib/briefing/format-weekly";
import { deriveKeySignal } from "@/lib/briefing/key-signal";
import { parseWeeklyBriefingResponse } from "@/lib/intelligence/parse-tagged-weekly";
import { selectWeeklyNarrativeForSynthesis } from "@/lib/briefing/narrative-synthesis";
import {
  callAIJson,
  getAIProvider,
  intelligenceGeneratedByProvider,
  isAIConfigured,
  isAIFallbackAllowed,
} from "@/lib/intelligence/provider";
import type { IntelligenceGeneratedBy } from "@/lib/intelligence/types";
import type { OnboardingProfile, Story } from "@/lib/types";

export type WeeklyBriefingMode = "for-you" | "global";

export type WeeklyBriefing = {
  weekLabel: string;
  headline: string;
  summary: string;
  keySignal: string;
  mode: WeeklyBriefingMode;
  generatedBy: IntelligenceGeneratedBy;
  aiError?: string;
  /** @deprecated Use aiError */
  openaiError?: string;
};

const CACHE_TTL_MS = 30 * 60 * 1000;

type BriefingCacheEntry = {
  generatedAt: string;
  briefing: WeeklyBriefing;
};

const briefingStore = createMemoryStore<BriefingCacheEntry>({
  ttlMs: CACHE_TTL_MS,
  maxEntries: 120,
});

function getWeekRangeLabel(): string {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(weekAgo)} – ${fmt(now)}`;
}

async function readBriefingCache(
  key: string,
  mode: WeeklyBriefingMode
): Promise<WeeklyBriefing | null> {
  const entry = briefingStore.get(key);
  const memBriefing = entry?.briefing;
  if (memBriefing?.mode === mode) {
    return memBriefing;
  }

  const persisted = await readPersistedWeeklyBriefing(key);
  if (!persisted || persisted.mode !== mode) return null;

  briefingStore.set(key, {
    generatedAt: new Date().toISOString(),
    briefing: persisted,
  });
  return persisted;
}

async function writeBriefingCache(
  key: string,
  briefing: WeeklyBriefing
): Promise<void> {
  briefingStore.set(key, {
    generatedAt: new Date().toISOString(),
    briefing,
  });
  await writePersistedWeeklyBriefing(key, briefing);
}

function selectNarrativeForMode(
  stories: Story[],
  mode: WeeklyBriefingMode,
  profile: OnboardingProfile | null
) {
  return selectWeeklyNarrativeForSynthesis(stories, mode, profile);
}

function buildSyncBriefing(
  stories: Story[],
  mode: WeeklyBriefingMode,
  profile: OnboardingProfile | null,
  aiError?: string
): WeeklyBriefing {
  const narrative = selectNarrativeForMode(stories, mode, profile);
  const selected = narrative.stories;

  const base = {
    weekLabel: getWeekRangeLabel(),
    generatedBy: "fallback" as const,
    aiError,
    openaiError: aiError,
  };

  return {
    ...base,
    mode,
    headline: deriveFallbackHeadline(selected, mode, profile),
    summary: deriveFallbackSummary(selected, mode, profile),
    keySignal: deriveKeySignal(selected),
  };
}

async function buildAIBriefing(
  stories: Story[],
  mode: WeeklyBriefingMode,
  profile: OnboardingProfile | null
): Promise<{ briefing: WeeklyBriefing | null; error?: string }> {
  const narrative = selectNarrativeForMode(stories, mode, profile);
  const selected = narrative.stories;
  const withBodies = await Promise.all(
    selected.map((s) => ensureStoryArticleBody(s))
  );
  const { system, user } = buildWeeklyBriefingPrompt(
    withBodies,
    mode,
    profile,
    narrative
  );

  const provider = getAIProvider();
  const weekLabel = getWeekRangeLabel();
  const result = await callAIJson({
    label: `Weekly briefing · ${mode}`,
    system,
    user,
    temperature: 0.2,
    maxTokens: 950,
    responseFormat: "tags",
    parse: (content) =>
      parseWeeklyBriefingResponse(content, mode, selected, weekLabel, profile),
  });

  if (!result.ok) {
    console.warn(
      `[${provider.toUpperCase()}] Weekly briefing fallback for ${mode} — reason: ${result.error}`
    );
    return { briefing: null, error: result.error };
  }

  const briefing = result.data;
  if (briefing.mode !== mode) {
    return {
      briefing: null,
      error: `${provider} returned wrong briefing mode`,
    };
  }
  return { briefing };
}

export type ResolveWeeklyBriefingOptions = {
  /** Bypass cache — used only for manual intelligence refresh. */
  force?: boolean;
};

export async function resolveWeeklyBriefing(
  stories: Story[],
  mode: WeeklyBriefingMode,
  profile: OnboardingProfile | null,
  options?: ResolveWeeklyBriefingOptions
): Promise<WeeklyBriefing> {
  const narrative = selectNarrativeForMode(stories, mode, profile);
  const cacheKey = weeklyBriefingCacheKey(mode, profile, narrative.clusterId);

  if (!options?.force) {
    const platform = await readPlatformIntelligenceSnapshot();
    const platformBriefing = platform?.briefings?.[mode];
    if (platformBriefing && platformBriefing.mode === mode) {
      return platformBriefing;
    }

    const cached = await readBriefingCache(cacheKey, mode);
    if (cached) return cached;

    return buildSyncBriefing(stories, mode, profile);
  }

  if (!isAIConfigured()) {
    const provider = getAIProvider();
    const keyName =
      provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
    const offline = buildSyncBriefing(
      stories,
      mode,
      profile,
      `${keyName} is not configured`
    );
    await writeBriefingCache(cacheKey, offline);
    return offline;
  }

  const { briefing: ai, error: aiError } = await buildAIBriefing(
    stories,
    mode,
    profile
  );
  if (ai) {
    await writeBriefingCache(cacheKey, ai);
    return ai;
  }

  const provider = getAIProvider();
  const lastError =
    aiError ??
    `${provider} weekly briefing failed (see server logs for [${provider.toUpperCase()}] lines)`;

  if (!isAIFallbackAllowed()) {
    throw new Error(lastError);
  }

  return buildSyncBriefing(stories, mode, profile, lastError);
}
