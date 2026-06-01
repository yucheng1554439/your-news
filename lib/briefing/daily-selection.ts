import {
  buildClusterIntelligence,
  clusterStoriesForBriefing,
} from "@/lib/editorial/cluster-intelligence";
import { buildNarrativeClusters } from "@/lib/editorial/narrative-clusters";
import { filterStoriesForCadence } from "@/lib/briefing/cadence";
import { storyHasUsableMaterial } from "@/lib/briefing/source-material";
import { getStrategicSignal, isBriefingEligible } from "@/lib/signal/strategic-score";
import { scoreStoryForReader } from "@/lib/briefing/reader-scoring";
import {
  rankStoriesForUser,
  rankStoriesGlobal,
} from "@/lib/personalization/engine";
import type {
  WeeklyBriefingSelection,
  NarrativeThread,
} from "@/lib/briefing/weekly-selection";
import type { UserIntelligenceProfile } from "@/lib/personalization/intelligence-profile";
import type { BriefingMode } from "@/lib/briefing/types";
import type { OnboardingProfile, Story } from "@/lib/types";

function hoursSince(publishedAt: string): number {
  const t = Date.parse(publishedAt);
  if (!Number.isFinite(t)) return 999;
  return (Date.now() - t) / (60 * 60 * 1000);
}

function eventRecencyScore(story: Story): number {
  const hours = hoursSince(story.publishedAt);
  if (hours > 48) return 0;
  if (hours > 24) return (Math.max(0, 48 - hours) / 24) * 5;
  const recency = Math.max(0, 24 - hours) / 24;
  return recency * 10;
}

type DailyPoolTier = "24h" | "48h" | "all";

function buildDailyPool(
  stories: Story[],
  tier: DailyPoolTier
): Story[] {
  const cadencePool = filterStoriesForCadence(stories, "daily");
  if (tier === "all") {
    return [...cadencePool].sort(
      (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
    );
  }
  const maxHours = tier === "24h" ? 24 : 48;
  return cadencePool.filter((s) => hoursSince(s.publishedAt) <= maxHours);
}

function rankPool(
  pool: Story[],
  mode: BriefingMode,
  profile: OnboardingProfile | null,
  intelligence?: UserIntelligenceProfile | null
): Story[] {
  const signalPool = pool.filter(isBriefingEligible);
  const basePool = signalPool.length > 0 ? signalPool : pool;

  const base =
    mode === "for-you" && profile?.completed
      ? rankStoriesForUser(basePool, profile, intelligence)
      : rankStoriesGlobal(basePool);

  return [...base].sort((a, b) => {
    const scoreA =
      eventRecencyScore(a) +
      getStrategicSignal(a) * 6 +
      scoreStoryForReader(a, profile, intelligence) +
      (storyHasUsableMaterial(a) ? 3 : 0);
    const scoreB =
      eventRecencyScore(b) +
      getStrategicSignal(b) * 6 +
      scoreStoryForReader(b, profile, intelligence) +
      (storyHasUsableMaterial(b) ? 3 : 0);
    return scoreB - scoreA;
  });
}

function rankDailyPool(
  stories: Story[],
  mode: BriefingMode,
  profile: OnboardingProfile | null,
  intelligence?: UserIntelligenceProfile | null
): { ranked: Story[]; tier: DailyPoolTier } {
  const tiers: DailyPoolTier[] = ["24h", "48h", "all"];

  for (const tier of tiers) {
    const pool = buildDailyPool(stories, tier);
    const ranked = rankPool(pool, mode, profile, intelligence);
    if (ranked.length > 0) {
      if (tier !== "24h") {
        console.warn(
          `[DAILY] selection expanded pool to ${tier} — ${ranked.length} stories (24h pool was empty)`
        );
      }
      return { ranked, tier };
    }
  }

  return { ranked: [], tier: "all" };
}

function pickDailyEventCluster(corpus: Story[], ranked: Story[]) {
  const clusters = buildNarrativeClusters(corpus);
  if (clusters.length === 0) return null;

  const lead = ranked[0];
  if (lead) {
    const leadCluster = clusters.find((c) =>
      c.stories.some((s) => s.slug === lead.slug)
    );
    if (leadCluster) return leadCluster;
  }

  const multi = clusters.filter((c) => c.size >= 2);
  return multi[0] ?? clusters[0] ?? null;
}

function fallbackLeadStory(
  stories: Story[],
  mode: BriefingMode,
  profile: OnboardingProfile | null
): Story | undefined {
  const ranked = rankPool(stories, mode, profile);
  return ranked.find((s) => storyHasUsableMaterial(s)) ?? ranked[0];
}

/**
 * Daily = EVENT briefing (last 24h). One event from full cluster coverage.
 */
export function selectDailyEventBriefing(
  stories: Story[],
  mode: BriefingMode,
  profile: OnboardingProfile | null,
  intelligence?: UserIntelligenceProfile | null
): WeeklyBriefingSelection {
  const { ranked, tier } = rankDailyPool(stories, mode, profile, intelligence);
  let eventCluster = pickDailyEventCluster(stories, ranked);

  if (!eventCluster) {
    const fallback = fallbackLeadStory(stories, mode, profile);
    if (fallback) {
      console.warn(
        `[DAILY] no ranked cluster — using fallback lead ${fallback.slug} (tier=${tier})`
      );
      const fallbackClusters = buildNarrativeClusters([fallback]);
      eventCluster = fallbackClusters[0] ?? null;
    }
  }

  const clusterIntel = eventCluster
    ? buildClusterIntelligence(eventCluster)
    : null;
  const theme = eventCluster?.theme ?? ("general" as const);

  const thread: NarrativeThread = {
    clusterId: eventCluster?.id ?? "event:none",
    theme,
    label: clusterIntel?.title ?? "Today's development",
    personalScore: 0,
    cluster: clusterIntel ?? undefined,
    stories: eventCluster
      ? clusterStoriesForBriefing(eventCluster)
      : [],
  };

  return {
    cadence: "daily",
    mode,
    lens: "event",
    cacheKeyId: `event:${mode}:${eventCluster?.id ?? "none"}:${new Date().toISOString().slice(0, 10)}`,
    threads: [thread],
  };
}
