import {
  buildNarrativeClusters,
  detectNarrativeTheme,
  type NarrativeCluster,
  type NarrativeTheme,
} from "@/lib/editorial/narrative-clusters";
import { THEME_LABELS } from "@/lib/briefing/narrative-synthesis";
import { scoreWeeklyNarrativeWeight } from "@/lib/editorial/weekly-narrative";
import { computeSemanticRelevance } from "@/lib/personalization/relevance";
import { rankStoriesForUser } from "@/lib/personalization/engine";
import type { WeeklyBriefingSelection, NarrativeThread } from "@/lib/briefing/weekly-selection";
import type { OnboardingProfile, Story } from "@/lib/types";

const MAX_THREADS = 4;
const MIN_THREADS = 2;
const STORIES_PER_THREAD = 2;
const MIN_PERSONAL_SCORE = 3.2;

const CAREER_THEME_AFFINITY: Record<
  NonNullable<OnboardingProfile["career"]>,
  NarrativeTheme[]
> = {
  investor: [
    "fed-rates",
    "banking-financial",
    "nvidia-semis",
    "energy-commodities",
    "geopolitics-conflict",
    "ai-capex",
  ],
  engineer: [
    "ai-capex",
    "nvidia-semis",
    "hyperscaler-cloud",
    "big-tech-ai",
    "cyber-breach",
    "policy-regulation",
  ],
  founder: [
    "ai-capex",
    "big-tech-ai",
    "hyperscaler-cloud",
    "policy-regulation",
    "fed-rates",
    "nvidia-semis",
  ],
  executive: [
    "geopolitics-conflict",
    "policy-regulation",
    "fed-rates",
    "energy-commodities",
    "ai-capex",
  ],
  researcher: [
    "policy-regulation",
    "ai-capex",
    "big-tech-ai",
    "energy-commodities",
    "fed-rates",
  ],
};

function rankPersonalPool(
  stories: Story[],
  profile: OnboardingProfile | null
): Story[] {
  if (profile?.completed) {
    return rankStoriesForUser(stories, profile).filter(
      (s) => scoreWeeklyNarrativeWeight(s, profile) >= 2.2
    );
  }
  return stories
    .filter((s) => scoreWeeklyNarrativeWeight(s, profile) >= 2.4)
    .slice(0, 40);
}

function clusterPersonalScore(
  cluster: NarrativeCluster,
  profile: OnboardingProfile
): number {
  const scores = cluster.stories.map((s) =>
    computeSemanticRelevance(s, profile)
  );
  const max = Math.max(...scores, 0);
  const avg =
    scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length);
  return max * 0.7 + avg * 0.55;
}

function focusBoost(
  cluster: NarrativeCluster,
  profile: OnboardingProfile
): number {
  switch (profile.focusType) {
    case "breaking":
      return cluster.corroborationScore * 4 + cluster.tier1Count * 1.2;
    case "depth":
      return cluster.size * 0.9 + cluster.tier1Count * 2;
    case "breadth":
    default:
      return 1.5;
  }
}

function careerAffinityBoost(
  theme: NarrativeTheme,
  profile: OnboardingProfile
): number {
  if (!profile.career) return 0;
  return CAREER_THEME_AFFINITY[profile.career]?.includes(theme) ? 3.5 : 0;
}

function scoreClusterForReader(
  cluster: NarrativeCluster,
  profile: OnboardingProfile
): number {
  const personal = clusterPersonalScore(cluster, profile);
  return (
    personal * 4.2 +
    careerAffinityBoost(cluster.theme, profile) +
    focusBoost(cluster, profile) +
    cluster.corroborationScore * 2
  );
}

function pickThreadStories(
  cluster: NarrativeCluster,
  profile: OnboardingProfile
): Story[] {
  return [...cluster.stories]
    .sort(
      (a, b) =>
        computeSemanticRelevance(b, profile) -
        computeSemanticRelevance(a, profile)
    )
    .slice(0, STORIES_PER_THREAD);
}

function buildCacheKeyId(threads: NarrativeThread[]): string {
  const ids = threads
    .map((t) => t.clusterId)
    .sort()
    .join("+");
  return `multi:${ids.slice(0, 120)}`;
}

/**
 * For You: select multiple narrative threads that matter to this reader.
 */
export function selectPersonalizedWeeklyThreads(
  stories: Story[],
  profile: OnboardingProfile | null
): WeeklyBriefingSelection {
  const pool = rankPersonalPool(stories, profile);
  const clusters = buildNarrativeClusters(pool);

  if (!profile?.completed || clusters.length === 0) {
    return fallbackSelection(pool, profile);
  }

  const ranked = clusters
    .map((cluster) => ({
      cluster,
      personal: clusterPersonalScore(cluster, profile),
      score: scoreClusterForReader(cluster, profile),
    }))
    .filter((row) => row.personal >= MIN_PERSONAL_SCORE)
    .sort((a, b) => b.score - a.score);

  const threads: NarrativeThread[] = [];
  const usedThemes = new Set<NarrativeTheme>();

  for (const row of ranked) {
    if (threads.length >= MAX_THREADS) break;
    const theme = row.cluster.theme;
    if (
      usedThemes.has(theme) &&
      threads.length >= MIN_THREADS &&
      row.personal < MIN_PERSONAL_SCORE + 1.5
    ) {
      continue;
    }
    usedThemes.add(theme);
    threads.push({
      clusterId: row.cluster.id,
      theme,
      label: THEME_LABELS[theme] ?? theme,
      personalScore: Math.round(row.personal * 10) / 10,
      stories: pickThreadStories(row.cluster, profile),
    });
  }

  if (threads.length < MIN_THREADS && ranked.length > threads.length) {
    for (const row of ranked) {
      if (threads.length >= MIN_THREADS) break;
      if (threads.some((t) => t.clusterId === row.cluster.id)) continue;
      threads.push({
        clusterId: row.cluster.id,
        theme: row.cluster.theme,
        label: THEME_LABELS[row.cluster.theme] ?? row.cluster.theme,
        personalScore: Math.round(row.personal * 10) / 10,
        stories: pickThreadStories(row.cluster, profile),
      });
    }
  }

  if (threads.length === 0) {
    return fallbackSelection(pool, profile);
  }

  return {
    mode: "for-you",
    cacheKeyId: buildCacheKeyId(threads),
    threads,
  };
}

function fallbackSelection(
  pool: Story[],
  profile: OnboardingProfile | null
): WeeklyBriefingSelection {
  const top = pool.slice(0, 6);
  const theme = top[0] ? detectNarrativeTheme(top[0]) : ("general" as NarrativeTheme);
  return {
    mode: "for-you",
    cacheKeyId: "multi:fallback",
    threads: [
      {
        clusterId: "fallback",
        theme,
        label: THEME_LABELS[theme],
        personalScore: 0,
        stories: top.slice(0, STORIES_PER_THREAD),
      },
    ],
  };
}
