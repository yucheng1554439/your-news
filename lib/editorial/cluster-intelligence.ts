import { THEME_LABELS } from "@/lib/briefing/narrative-synthesis";
import { getStorySourceTier } from "@/lib/editorial/source-authority";
import {
  buildNarrativeClusters,
  detectNarrativeTheme,
  extractEntities,
  type NarrativeCluster,
  type NarrativeTheme,
} from "@/lib/editorial/narrative-clusters";
import { getDisplayTags } from "@/lib/intelligence/story-tags";
import {
  isArticleLikeHeadline,
  normalizeThesisHeadline,
} from "@/lib/briefing/thesis-title";
import type {
  ClusterIntelligence,
  ClusterSource,
  Importance,
  Story,
  TimelineEvent,
} from "@/lib/types";

export const MAX_CLUSTER_BRIEFING_STORIES = 40;
export const MAX_CLUSTER_INTELLIGENCE_STORIES = 40;

const THEME_SHORT: Partial<Record<NarrativeTheme, string>> = {
  "nvidia-semis": "Semiconductor Cycle",
  "ai-capex": "AI Infrastructure",
  "hyperscaler-cloud": "Hyperscaler Capex",
  "fed-rates": "Rates & Liquidity",
  "geopolitics-conflict": "Geopolitical Risk",
  "energy-commodities": "Energy & Commodities",
  "big-tech-ai": "Frontier AI",
  "cyber-breach": "Cyber Risk",
  "policy-regulation": "Policy Shift",
  "banking-financial": "Banking & Credit",
  "humanitarian-social": "Humanitarian Stress",
  general: "Developing Story",
};

const GEO_LOCATIONS: { label: string; pattern: RegExp }[] = [
  { label: "Iran", pattern: /\biran\b/i },
  { label: "Israel", pattern: /\bisrael\b/i },
  { label: "Gaza", pattern: /\bgaza\b/i },
  { label: "Ukraine", pattern: /\bukraine\b/i },
  { label: "Taiwan", pattern: /\btaiwan\b/i },
  { label: "China", pattern: /\bchina\b/i },
  { label: "Russia", pattern: /\brussia\b/i },
  { label: "Nvidia", pattern: /\bnvidia\b/i },
];

const ENTITY_TITLES: Record<string, string> = {
  nvidia: "Nvidia",
  openai: "OpenAI",
  anthropic: "Anthropic",
  microsoft: "Microsoft",
  google: "Google",
  apple: "Apple",
  amazon: "Amazon",
  meta: "Meta",
  tsmc: "TSMC",
  fed: "Fed",
  china: "China",
  ukraine: "Ukraine",
  opec: "OPEC",
};

function clusterBlob(cluster: NarrativeCluster): string {
  return cluster.stories
    .map((s) => `${s.headline} ${s.summary} ${s.rawExcerpt ?? ""}`)
    .join(" ");
}

function detectLocationTitle(cluster: NarrativeCluster): string | null {
  const blob = clusterBlob(cluster);
  for (const { label, pattern } of GEO_LOCATIONS) {
    if (pattern.test(blob)) return label;
  }
  return null;
}

function detectEventDescriptor(cluster: NarrativeCluster): string {
  const blob = clusterBlob(cluster);
  if (/\b(escalat|tension|conflict|strike|attack|missile|war|invasion)\b/i.test(blob)) {
    return "Escalation";
  }
  if (/\b(sanction|embargo|tariff)\b/i.test(blob)) return "Sanctions";
  if (/\b(earnings|revenue|guidance|profit warning)\b/i.test(blob)) {
    return "Earnings";
  }
  if (/\b(rate cut|rate hike|fed funds|powell|fomc)\b/i.test(blob)) {
    return "Rates";
  }
  if (/\b(data breach|ransomware|cyber attack)\b/i.test(blob)) return "Cyber Incident";
  if (cluster.theme === "geopolitics-conflict") return "Crisis";
  if (cluster.theme === "ai-capex") return "Buildout";
  return "Developments";
}

export function buildClusterTitle(cluster: NarrativeCluster): string {
  const location = detectLocationTitle(cluster);
  const descriptor = detectEventDescriptor(cluster);
  if (location) return `${location} ${descriptor}`;

  for (const entity of cluster.entities) {
    const name = ENTITY_TITLES[entity];
    if (name) return `${name} ${descriptor}`;
  }

  const themeShort = THEME_SHORT[cluster.theme];
  if (themeShort && cluster.theme !== "general") return themeShort;

  const headline = cluster.representative.headline;
  if (!isArticleLikeHeadline(headline)) {
    const short = headline.split(/[:\-–—|]/)[0]?.trim();
    if (short && short.length <= 72 && !isArticleLikeHeadline(short)) {
      return normalizeThesisHeadline(short, "global", "weekly", themeShort ?? "Developing Story");
    }
  }

  return themeShort ?? "Developing Story";
}

function uniqueSources(cluster: NarrativeCluster): ClusterSource[] {
  const byName = new Map<string, ClusterSource>();
  for (const story of cluster.stories) {
    const name = (story.source || "Unknown").trim();
    const tier = getStorySourceTier(story);
    const existing = byName.get(name);
    if (
      !existing ||
      tier < existing.tier ||
      Date.parse(story.publishedAt) > Date.parse(existing.publishedAt)
    ) {
      byName.set(name, {
        name,
        tier,
        url: story.sourceUrl,
        slug: story.slug,
        publishedAt: story.publishedAt,
      });
    }
  }
  return [...byName.values()].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  });
}

function buildClusterSummary(
  cluster: NarrativeCluster,
  sources: ClusterSource[]
): string {
  const rep = cluster.representative;
  const base =
    rep.summary?.trim() ||
    rep.whyItMatters?.trim() ||
    rep.headline;

  if (cluster.size <= 1) return base;

  const topNames = sources.slice(0, 4).map((s) => s.name);
  const outletList =
    topNames.length >= 2
      ? `${topNames.slice(0, -1).join(", ")} and ${topNames[topNames.length - 1]}`
      : topNames[0] ?? "multiple outlets";

  return `${base} Corroborated across ${cluster.size} reports and ${sources.length} sources, including ${outletList}.`;
}

function buildClusterTimeline(cluster: NarrativeCluster): TimelineEvent[] {
  return [...cluster.stories]
    .sort(
      (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
    )
    .slice(0, 12)
    .map((s) => ({
      date: new Date(s.publishedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      event: s.headline.length > 140 ? `${s.headline.slice(0, 137)}…` : s.headline,
    }));
}

function collectClusterTags(cluster: NarrativeCluster): string[] {
  const set = new Set<string>();
  for (const story of cluster.stories) {
    for (const tag of getDisplayTags(story, 6)) {
      set.add(tag);
    }
  }
  const themeLabel = THEME_LABELS[cluster.theme];
  if (themeLabel) set.add(themeLabel);
  return [...set].slice(0, 8);
}

export function buildClusterIntelligence(
  cluster: NarrativeCluster
): ClusterIntelligence {
  const sources = uniqueSources(cluster);
  const rep = cluster.representative;
  const importanceScore =
    rep.importanceScore ??
    Math.min(
      10,
      Math.round(
        5 +
          cluster.corroborationScore * 3 +
          Math.min(cluster.size, 12) * 0.35 +
          cluster.tier1Count * 0.5
      )
    );
  const importance: Importance =
    importanceScore >= 8 || rep.importance === "critical"
      ? "critical"
      : importanceScore >= 6 || rep.importance === "high"
        ? "high"
        : "medium";

  return {
    id: cluster.id,
    theme: cluster.theme,
    title: buildClusterTitle(cluster),
    summary: buildClusterSummary(cluster, sources),
    sources,
    articleCount: cluster.size,
    sourceCount: sources.length,
    importance,
    importanceScore,
    importanceLabel: rep.importanceLabel,
    tags: collectClusterTags(cluster),
    entities: cluster.entities,
    timeline: buildClusterTimeline(cluster),
    corroborationScore: cluster.corroborationScore,
    representativeSlug: rep.slug,
    representative: {
      ...rep,
      clusterSize: cluster.size,
      corroborationScore: cluster.corroborationScore,
      narrativeClusterId: cluster.id,
      isClusterRepresentative: true,
    },
    stories: cluster.stories,
  };
}

export function buildClusterIntelligenceFromStories(
  stories: Story[],
  options?: { minSize?: number; limit?: number }
): ClusterIntelligence[] {
  const minSize = options?.minSize ?? 1;
  const limit = options?.limit ?? 60;
  return buildNarrativeClusters(stories)
    .filter((c) => c.size >= minSize)
    .slice(0, limit)
    .map(buildClusterIntelligence);
}

export function findClusterForStory(
  story: Story,
  corpus: Story[]
): ClusterIntelligence | null {
  const clusters = buildNarrativeClusters(corpus);
  const match =
    clusters.find((c) => c.id === story.narrativeClusterId) ??
    clusters.find((c) => c.stories.some((s) => s.slug === story.slug));
  return match ? buildClusterIntelligence(match) : null;
}

/** All cluster articles for AI synthesis — tier-sorted, high cap. */
export function clusterStoriesForBriefing(
  cluster: NarrativeCluster,
  max = MAX_CLUSTER_BRIEFING_STORIES
): Story[] {
  return [...cluster.stories]
    .sort((a, b) => {
      const tierDiff = getStorySourceTier(a) - getStorySourceTier(b);
      if (tierDiff !== 0) return tierDiff;
      return (b.importanceScore ?? 0) - (a.importanceScore ?? 0);
    })
    .slice(0, max);
}

export function enrichStoriesWithClusterTimelines(
  stories: Story[]
): Story[] {
  const clusters = buildNarrativeClusters(stories);
  const bySlug = new Map<string, TimelineEvent[]>();
  for (const cluster of clusters) {
    const timeline = buildClusterTimeline(cluster);
    for (const s of cluster.stories) {
      bySlug.set(s.slug, timeline);
    }
  }
  return stories.map((s) =>
    bySlug.has(s.slug) ? { ...s, timeline: bySlug.get(s.slug) } : s
  );
}
