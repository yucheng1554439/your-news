import {
  buildClusterIntelligence,
  clusterStoriesForBriefing,
  MAX_CLUSTER_BRIEFING_STORIES,
} from "@/lib/editorial/cluster-intelligence";
import {
  buildNarrativeClusters,
  type NarrativeCluster,
  type NarrativeTheme,
} from "@/lib/editorial/narrative-clusters";
import { THEME_LABELS } from "@/lib/briefing/narrative-synthesis";
import { scoreWeeklyNarrativeWeight } from "@/lib/editorial/weekly-narrative";
import { scoreStoryForReader } from "@/lib/briefing/reader-scoring";
import { computeSemanticRelevance } from "@/lib/personalization/relevance";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import {
  getStrategicSignal,
  isBriefingEligible,
} from "@/lib/signal/strategic-score";
import type { ClusterIntelligence } from "@/lib/types";
import type { OnboardingProfile, Story } from "@/lib/types";

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

export type WeeklyIntelligenceMapEntry = {
  cluster: NarrativeCluster;
  intelligence: ClusterIntelligence;
  /** Editorial / world-importance score */
  globalScore: number;
  /** Reader-specific relevance score */
  personalScore: number;
  /** Full cluster articles for AI synthesis */
  stories: Story[];
};

export type WeeklyIntelligenceMap = {
  corpusSize: number;
  clusterCount: number;
  totalStoryCount: number;
  entries: WeeklyIntelligenceMapEntry[];
};

function weeklyCorpusPool(corpus: Story[]): Story[] {
  const eligible = corpus.filter(isBriefingEligible);
  return eligible.length > 0 ? eligible : corpus;
}

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

export function scoreClusterForReader(
  cluster: NarrativeCluster,
  profile: OnboardingProfile,
  intelligence?: UserIntelligenceProfile | null
): number {
  const personal = clusterPersonalScore(cluster, profile);
  const behavior = cluster.stories.reduce(
    (sum, s) => sum + scoreStoryForReader(s, profile, intelligence),
    0
  );
  return (
    personal * 4.2 +
    behavior * (intelligence?.behaviorConfidence ?? 0) * 1.2 +
    careerAffinityBoost(cluster.theme, profile) +
    focusBoost(cluster, profile) +
    cluster.corroborationScore * 2 +
    scoreGlobalCluster(cluster) * 0.15
  );
}

/**
 * Cluster the FULL weekly corpus into a narrative intelligence map.
 * Personalization ranks clusters — it does not shrink the corpus before clustering.
 */
export function buildWeeklyIntelligenceMap(
  corpus: Story[],
  profile: OnboardingProfile | null,
  mode: "global" | "for-you",
  intelligence?: UserIntelligenceProfile | null
): WeeklyIntelligenceMap {
  const pool = weeklyCorpusPool(corpus);
  const clusters = buildNarrativeClusters(pool);

  const entries: WeeklyIntelligenceMapEntry[] = clusters.map((cluster) => {
    const globalScore = scoreGlobalCluster(cluster);
    const personalScore =
      mode === "for-you" && profile?.completed
        ? scoreClusterForReader(cluster, profile, intelligence)
        : globalScore;

    return {
      cluster,
      intelligence: buildClusterIntelligence(cluster),
      globalScore,
      personalScore,
      stories: clusterStoriesForBriefing(
        cluster,
        MAX_CLUSTER_BRIEFING_STORIES
      ),
    };
  });

  entries.sort((a, b) =>
    mode === "for-you"
      ? b.personalScore - a.personalScore
      : b.globalScore - a.globalScore
  );

  const totalStoryCount = entries.reduce(
    (n, e) => n + e.stories.length,
    0
  );

  return {
    corpusSize: pool.length,
    clusterCount: entries.length,
    totalStoryCount,
    entries,
  };
}

export function formatWeeklyLandscapeSummary(map: WeeklyIntelligenceMap): string {
  const lines = [
    `Weekly corpus: ${map.corpusSize} stories · ${map.clusterCount} narrative clusters · ${map.totalStoryCount} articles in synthesis material`,
  ];

  for (const [idx, entry] of map.entries.slice(0, 10).entries()) {
    lines.push(
      `${idx + 1}. ${THEME_LABELS[entry.cluster.theme] ?? entry.cluster.theme} — ${entry.intelligence.title} (${entry.stories.length} articles, personal=${entry.personalScore.toFixed(1)}, global=${entry.globalScore.toFixed(1)})`
    );
  }

  return lines.join("\n");
}
