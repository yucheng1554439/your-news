import {
  buildNarrativeClusters,
  detectNarrativeTheme,
  type NarrativeCluster,
  type NarrativeTheme,
} from "@/lib/editorial/narrative-clusters";
import { scoreWeeklyNarrativeWeight } from "@/lib/editorial/weekly-narrative";
import { getStrategicSignal, isBriefingEligible } from "@/lib/signal/strategic-score";
import { rankStoriesGlobal } from "@/lib/personalization/engine";
import type { OnboardingProfile, Story } from "@/lib/types";

const MAX_GLOBAL_STORIES = 6;

/** World-importance weights — balanced across macro, tech, policy, enterprise. */
const GLOBAL_THEME_PRIORITY: Record<NarrativeTheme, number> = {
  "geopolitics-conflict": 9.4,
  "fed-rates": 8.6,
  "energy-commodities": 8.8,
  "ai-capex": 9.2,
  "nvidia-semis": 9,
  "hyperscaler-cloud": 8.8,
  "big-tech-ai": 8.6,
  "policy-regulation": 8.5,
  "banking-financial": 8.2,
  "cyber-breach": 7.8,
  "humanitarian-social": 3,
  general: 2,
};

export const THEME_LABELS: Record<NarrativeTheme, string> = {
  "nvidia-semis": "semiconductors & AI chips",
  "ai-capex": "AI infrastructure & enterprise spending",
  "hyperscaler-cloud": "hyperscaler cloud & capex",
  "fed-rates": "rates, inflation & liquidity",
  "geopolitics-conflict": "geopolitics & conflict risk",
  "energy-commodities": "energy & commodities",
  "big-tech-ai": "frontier AI & big tech",
  "cyber-breach": "cybersecurity & systemic risk",
  "policy-regulation": "policy & regulation",
  "banking-financial": "banking, credit & bond markets",
  "humanitarian-social": "humanitarian & social stress",
  general: "general developments",
};

export type GlobalWeeklyNarrative = {
  clusterId: string;
  theme: NarrativeTheme;
  narrativeLabel: string;
  stories: Story[];
};

function scoreGlobalCluster(cluster: NarrativeCluster): number {
  const themeBase = GLOBAL_THEME_PRIORITY[cluster.theme] ?? 2;
  const weights = cluster.stories.map((s) =>
    scoreWeeklyNarrativeWeight(s, null)
  );
  const avgWeight =
    weights.reduce((a, b) => a + b, 0) / Math.max(1, weights.length);
  const maxStrategic = Math.max(
    ...cluster.stories.map((s) => getStrategicSignal(s))
  );

  return (
    themeBase * 1.4 +
    avgWeight * 0.85 +
    maxStrategic * 5.5 +
    cluster.corroborationScore * 5 +
    cluster.size * 0.55 +
    cluster.tier1Count * 2.2
  );
}

/**
 * Global weekly: ONE dominant world narrative cluster.
 */
export function selectGlobalWeeklyNarrative(
  stories: Story[],
  _profile: OnboardingProfile | null
): GlobalWeeklyNarrative {
  const pool = rankStoriesGlobal(stories)
    .filter(isBriefingEligible)
    .filter((s) => scoreWeeklyNarrativeWeight(s, null) >= 2.6);
  const clusters = buildNarrativeClusters(pool);

  if (clusters.length === 0) {
    const fallback = pool[0];
    const theme = fallback
      ? detectNarrativeTheme(fallback)
      : ("general" as NarrativeTheme);
    return {
      clusterId: "global:fallback",
      theme,
      narrativeLabel: THEME_LABELS[theme],
      stories: pool.slice(0, MAX_GLOBAL_STORIES),
    };
  }

  const primary = [...clusters]
    .map((cluster) => ({ cluster, score: scoreGlobalCluster(cluster) }))
    .sort((a, b) => b.score - a.score)[0]!.cluster;

  const synthesisStories = [...primary.stories]
    .sort(
      (a, b) =>
        scoreWeeklyNarrativeWeight(b, null) -
        scoreWeeklyNarrativeWeight(a, null)
    )
    .slice(0, MAX_GLOBAL_STORIES);

  return {
    clusterId: `global:${primary.id}`,
    theme: primary.theme,
    narrativeLabel: THEME_LABELS[primary.theme] ?? primary.theme,
    stories: synthesisStories,
  };
}

/** @deprecated Use selectWeeklyBriefingSelection */
export function selectWeeklyNarrativeForSynthesis(
  stories: Story[],
  mode: "for-you" | "global",
  profile: OnboardingProfile | null
) {
  const global = selectGlobalWeeklyNarrative(stories, profile);
  return {
    clusterId: mode === "global" ? global.clusterId : `legacy:${global.clusterId}`,
    theme: global.theme,
    narrativeLabel: global.narrativeLabel,
    stories: global.stories,
    clusterScore: 0,
    mode,
  };
}
