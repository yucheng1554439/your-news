import {
  buildNarrativeClusters,
  detectNarrativeTheme,
  type NarrativeCluster,
  type NarrativeTheme,
} from "@/lib/editorial/narrative-clusters";
import { scoreWeeklyNarrativeWeight } from "@/lib/editorial/weekly-narrative";
import { getStrategicSignal } from "@/lib/signal/strategic-score";
import {
  rankStoriesForUser,
  rankStoriesGlobal,
} from "@/lib/personalization/engine";
import type { OnboardingProfile, Story } from "@/lib/types";
import type { WeeklyBriefingMode } from "@/lib/briefing/weekly-engine";

const MAX_SYNTHESIS_STORIES = 8;

const THEME_PRIORITY: Record<NarrativeTheme, number> = {
  "fed-rates": 10,
  "geopolitics-conflict": 9.5,
  "energy-commodities": 9,
  "nvidia-semis": 8.8,
  "ai-capex": 8.8,
  "hyperscaler-cloud": 8.5,
  "policy-regulation": 8.2,
  "banking-financial": 7.8,
  "big-tech-ai": 8,
  "cyber-breach": 7.5,
  "humanitarian-social": 2.5,
  general: 2,
};

const THEME_LABELS: Record<NarrativeTheme, string> = {
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

export type WeeklyNarrativeSelection = {
  clusterId: string;
  theme: NarrativeTheme;
  narrativeLabel: string;
  stories: Story[];
  clusterScore: number;
};

function rankPool(
  stories: Story[],
  mode: WeeklyBriefingMode,
  profile: OnboardingProfile | null
): Story[] {
  if (mode === "for-you" && profile?.completed) {
    return rankStoriesForUser(stories, profile).filter(
      (s) => scoreWeeklyNarrativeWeight(s, profile) >= 2.6
    );
  }
  return rankStoriesGlobal(stories).filter(
    (s) => scoreWeeklyNarrativeWeight(s, profile) >= 2.6
  );
}

function careerThemeBoost(
  theme: NarrativeTheme,
  profile: OnboardingProfile | null
): number {
  if (!profile?.career) return 0;
  const boosts: Record<
    NonNullable<OnboardingProfile["career"]>,
    NarrativeTheme[]
  > = {
    investor: [
      "fed-rates",
      "banking-financial",
      "energy-commodities",
      "geopolitics-conflict",
      "nvidia-semis",
    ],
    engineer: ["ai-capex", "nvidia-semis", "hyperscaler-cloud", "big-tech-ai", "cyber-breach"],
    founder: ["ai-capex", "big-tech-ai", "fed-rates", "policy-regulation"],
    executive: ["geopolitics-conflict", "fed-rates", "policy-regulation", "energy-commodities"],
    researcher: ["policy-regulation", "fed-rates", "big-tech-ai", "energy-commodities"],
  };
  return boosts[profile.career]?.includes(theme) ? 2 : 0;
}

function scoreCluster(
  cluster: NarrativeCluster,
  profile: OnboardingProfile | null
): number {
  const themeBase = THEME_PRIORITY[cluster.theme] ?? 2;
  const weights = cluster.stories.map((s) =>
    scoreWeeklyNarrativeWeight(s, profile)
  );
  const avgWeight =
    weights.reduce((a, b) => a + b, 0) / Math.max(1, weights.length);
  const maxStrategic = Math.max(
    ...cluster.stories.map((s) => getStrategicSignal(s))
  );

  return (
    themeBase * 1.4 +
    avgWeight * 0.85 +
    maxStrategic * 6 +
    cluster.corroborationScore * 5 +
    cluster.size * 0.6 +
    cluster.tier1Count * 1.8 +
    careerThemeBoost(cluster.theme, profile)
  );
}

function pickSynthesisStories(
  cluster: NarrativeCluster,
  profile: OnboardingProfile | null
): Story[] {
  return [...cluster.stories]
    .sort(
      (a, b) =>
        scoreWeeklyNarrativeWeight(b, profile) -
        scoreWeeklyNarrativeWeight(a, profile)
    )
    .slice(0, MAX_SYNTHESIS_STORIES);
}

/**
 * Select ONE coherent narrative cluster for weekly synthesis.
 * Never mixes unrelated themes (e.g. enterprise AI + food aid + banking).
 */
export function selectWeeklyNarrativeForSynthesis(
  stories: Story[],
  mode: WeeklyBriefingMode,
  profile: OnboardingProfile | null
): WeeklyNarrativeSelection {
  const pool = rankPool(stories, mode, profile);
  const clusters = buildNarrativeClusters(pool);

  if (clusters.length === 0) {
    const fallback = pool[0];
    const theme = fallback
      ? detectNarrativeTheme(fallback)
      : ("general" as NarrativeTheme);
    return {
      clusterId: "fallback",
      theme,
      narrativeLabel: THEME_LABELS[theme],
      stories: pool.slice(0, MAX_SYNTHESIS_STORIES),
      clusterScore: 0,
    };
  }

  const scored = clusters
    .map((cluster) => ({
      cluster,
      score: scoreCluster(cluster, profile),
    }))
    .sort((a, b) => b.score - a.score);

  const primary = scored[0]!.cluster;
  const synthesisStories = pickSynthesisStories(primary, profile);

  return {
    clusterId: primary.id,
    theme: primary.theme,
    narrativeLabel: THEME_LABELS[primary.theme] ?? primary.theme,
    stories: synthesisStories,
    clusterScore: scored[0]!.score,
  };
}
