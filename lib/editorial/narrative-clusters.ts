import { normalizeHeadlineKey } from "@/lib/importance-scoring";
import { getStorySourceTier } from "@/lib/editorial/source-authority";
import { tagOverlapScore } from "@/lib/intelligence/story-tags";
import type { Story } from "@/lib/types";

export type NarrativeTheme =
  | "nvidia-semis"
  | "ai-capex"
  | "hyperscaler-cloud"
  | "fed-rates"
  | "geopolitics-conflict"
  | "energy-commodities"
  | "big-tech-ai"
  | "cyber-breach"
  | "policy-regulation"
  | "banking-financial"
  | "humanitarian-social"
  | "general";

type ThemeRule = { theme: NarrativeTheme; pattern: RegExp };

const THEME_RULES: ThemeRule[] = [
  {
    theme: "nvidia-semis",
    pattern:
      /\b(nvidia|tsmc|amd|intel|semiconductor|hbm|gpu|foundry|chip export)\b/i,
  },
  {
    theme: "ai-capex",
    pattern:
      /\b(ai infrastructure|data center|hyperscaler|training cluster|cloud capex|power for ai|enterprise software|saas spending|it budget|developer tools|startup funding|venture capital|tech layoff)\b/i,
  },
  {
    theme: "hyperscaler-cloud",
    pattern: /\b(aws|azure|google cloud|meta platforms|cloud revenue)\b/i,
  },
  {
    theme: "fed-rates",
    pattern:
      /\b(fed\b|federal reserve|interest rate|inflation|treasury yield|rate cut|rate hike)\b/i,
  },
  {
    theme: "geopolitics-conflict",
    pattern:
      /\b(ukraine|china|taiwan|nato|sanction|ceasefire|invasion|missile|gaza|israel)\b/i,
  },
  {
    theme: "energy-commodities",
    pattern: /\b(opec|crude oil|natural gas|lng|pipeline|power grid)\b/i,
  },
  {
    theme: "big-tech-ai",
    pattern: /\b(openai|anthropic|google deepmind|microsoft ai|apple intelligence)\b/i,
  },
  {
    theme: "cyber-breach",
    pattern: /\b(ransomware|data breach|cyber attack|zero-day|cve)\b/i,
  },
  {
    theme: "policy-regulation",
    pattern:
      /\b(antitrust|sec charges|ftc|congress|legislation|eu commission|regulation)\b/i,
  },
  {
    theme: "banking-financial",
    pattern:
      /\b(bank regulation|fdic|basel|liquidity rule|regional bank|credit default|banking sector|bond market|treasury auction)\b/i,
  },
  {
    theme: "humanitarian-social",
    pattern:
      /\b(food insecurity|hunger crisis|humanitarian aid|food bank|poverty rate|malnutrition)\b/i,
  },
];

const ENTITY_PATTERNS: { id: string; pattern: RegExp }[] = [
  { id: "nvidia", pattern: /\bnvidia\b/i },
  { id: "broadcom", pattern: /\bbroadcom\b/i },
  { id: "openai", pattern: /\bopenai\b/i },
  { id: "anthropic", pattern: /\banthropic\b/i },
  { id: "microsoft", pattern: /\bmicrosoft\b/i },
  { id: "google", pattern: /\bgoogle\b/i },
  { id: "apple", pattern: /\bapple\b/i },
  { id: "amazon", pattern: /\bamazon\b/i },
  { id: "meta", pattern: /\bmeta\b/i },
  { id: "tsmc", pattern: /\btsmc\b/i },
  { id: "fed", pattern: /\b(fed|federal reserve)\b/i },
  { id: "china", pattern: /\bchina\b/i },
  { id: "ukraine", pattern: /\bukraine\b/i },
  { id: "opec", pattern: /\bopec\b/i },
];

export type NarrativeCluster = {
  id: string;
  theme: NarrativeTheme;
  entities: string[];
  stories: Story[];
  representative: Story;
  size: number;
  tier1Count: number;
  tier2Count: number;
  corroborationScore: number;
};

function storyBlob(story: Story): string {
  const tagBlob = [
    ...(story.strategicTags ?? []),
    ...(story.secondaryTags ?? []),
  ].join(" ");
  return `${story.headline} ${story.rawExcerpt ?? story.summary} ${tagBlob}`;
}

export function extractEntities(story: Story): string[] {
  const blob = storyBlob(story);
  const found: string[] = [];
  for (const { id, pattern } of ENTITY_PATTERNS) {
    if (pattern.test(blob)) found.push(id);
  }
  return found;
}

export function detectNarrativeTheme(story: Story): NarrativeTheme {
  const blob = storyBlob(story);
  for (const { theme, pattern } of THEME_RULES) {
    if (pattern.test(blob)) return theme;
  }
  return "general";
}

function tokenSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );
}

function tokenOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const t of a) {
    if (b.has(t)) shared += 1;
  }
  return shared / Math.min(a.size, b.size);
}

function shouldCluster(a: Story, b: Story): boolean {
  const themeA = a.narrativeTheme ?? detectNarrativeTheme(a);
  const themeB = b.narrativeTheme ?? detectNarrativeTheme(b);
  const entitiesA = new Set(a.narrativeEntities ?? extractEntities(a));
  const entitiesB = new Set(b.narrativeEntities ?? extractEntities(b));

  let sharedEntities = 0;
  for (const e of entitiesA) {
    if (entitiesB.has(e)) sharedEntities += 1;
  }

  if (sharedEntities >= 2) return true;
  if (sharedEntities >= 1 && themeA === themeB && themeA !== "general") {
    return true;
  }

  if (tagOverlapScore(a, b) >= 0.45) return true;
  if (
    tagOverlapScore(a, b) >= 0.28 &&
    (themeA === themeB || themeA === "general" || themeB === "general")
  ) {
    return true;
  }

  const headA = tokenSet(normalizeHeadlineKey(a.headline));
  const headB = tokenSet(normalizeHeadlineKey(b.headline));
  if (themeA !== themeB) {
    if (themeA !== "general" && themeB !== "general") {
      return false;
    }
  }

  if (tokenOverlap(headA, headB) >= 0.55) {
    return themeA === themeB || themeA === "general" || themeB === "general";
  }

  if (
    themeA === themeB &&
    themeA !== "general" &&
    tokenOverlap(headA, headB) >= 0.35
  ) {
    return true;
  }

  return false;
}

function clusterCorroborationScore(
  size: number,
  tier1Count: number,
  tier2Count: number
): number {
  if (size <= 1) return tier1Count > 0 ? 0.35 : 0.15;
  const multi = Math.min(1, (size - 1) * 0.22);
  const authority = Math.min(1, tier1Count * 0.35 + tier2Count * 0.12);
  return Math.min(1, 0.2 + multi + authority);
}

function pickRepresentative(stories: Story[]): Story {
  return [...stories].sort((a, b) => {
    const tierDiff = getStorySourceTier(a) - getStorySourceTier(b);
    if (tierDiff !== 0) return tierDiff;
    return (b.importanceScore ?? 0) - (a.importanceScore ?? 0);
  })[0];
}

function buildClusterFromStoryGroup(
  group: Story[],
  idSuffix?: string
): NarrativeCluster {
  const theme: NarrativeTheme =
    (group.find((s) => (s.narrativeTheme ?? "general") !== "general")
      ?.narrativeTheme as NarrativeTheme | undefined) ??
    detectNarrativeTheme(group[0]);
  const entities = [
    ...new Set(group.flatMap((s) => s.narrativeEntities ?? extractEntities(s))),
  ];
  const tier1Count = group.filter((s) => getStorySourceTier(s) === 1).length;
  const tier2Count = group.filter((s) => getStorySourceTier(s) === 2).length;
  const id = `${theme}:${idSuffix ?? (entities.slice(0, 4).join("+") || normalizeHeadlineKey(group[0].headline).slice(0, 40))}`;

  return {
    id,
    theme,
    entities,
    stories: group,
    representative: pickRepresentative(group),
    size: group.length,
    tier1Count,
    tier2Count,
    corroborationScore: clusterCorroborationScore(
      group.length,
      tier1Count,
      tier2Count
    ),
  };
}

function splitMegaCluster(mega: NarrativeCluster): NarrativeCluster[] {
  const byTheme = new Map<NarrativeTheme, Story[]>();
  for (const story of mega.stories) {
    const theme = (story.narrativeTheme ??
      detectNarrativeTheme(story)) as NarrativeTheme;
    const list = byTheme.get(theme) ?? [];
    list.push(story);
    byTheme.set(theme, list);
  }

  if (byTheme.size >= 2) {
    return [...byTheme.entries()]
      .map(([theme, stories], idx) =>
        buildClusterFromStoryGroup(stories, `theme-${theme}-${idx}`)
      )
      .sort(
        (a, b) =>
          b.corroborationScore * b.size - a.corroborationScore * a.size ||
          (b.representative.importanceScore ?? 0) -
            (a.representative.importanceScore ?? 0)
      );
  }

  const sorted = [...mega.stories].sort(
    (a, b) => (b.importanceScore ?? 0) - (a.importanceScore ?? 0)
  );
  const targetClusters = Math.min(
    5,
    Math.max(3, Math.ceil(sorted.length / 10))
  );
  const chunkSize = Math.max(3, Math.ceil(sorted.length / targetClusters));
  const chunks: NarrativeCluster[] = [];
  for (let i = 0; i < sorted.length; i += chunkSize) {
    chunks.push(
      buildClusterFromStoryGroup(
        sorted.slice(i, i + chunkSize),
        `desk-chunk-${i / chunkSize}`
      )
    );
  }
  return chunks.sort(
    (a, b) =>
      b.corroborationScore * b.size - a.corroborationScore * a.size ||
      (b.representative.importanceScore ?? 0) -
        (a.representative.importanceScore ?? 0)
  );
}

/**
 * Prevent single mega-clusters from collapsing weekly/global synthesis.
 * Re-splits when one cluster holds >80% of stories (unless corpus is tiny).
 */
export function ensureMinimumNarrativeClusters(
  clusters: NarrativeCluster[],
  options?: {
    minStories?: number;
    dominanceThreshold?: number;
  }
): NarrativeCluster[] {
  const minStories = options?.minStories ?? 20;
  const dominanceThreshold = options?.dominanceThreshold ?? 0.8;
  const totalStories = clusters.reduce((n, c) => n + c.size, 0);

  if (totalStories < minStories || clusters.length === 0) {
    return clusters;
  }

  if (clusters.length === 1) {
    const mega = clusters[0]!;
    if (mega.size / totalStories > dominanceThreshold) {
      const split = splitMegaCluster(mega);
      if (split.length > 1) {
        console.warn(
          "[BRIEFING_CLUSTER_WARNING]",
          JSON.stringify({
            reason: "mega_cluster_split",
            before: 1,
            after: split.length,
            stories: totalStories,
            clusterIds: split.map((c) => c.id).slice(0, 8),
          })
        );
        return split;
      }
    }
  }

  return clusters;
}

export function buildNarrativeClusters(stories: Story[]): NarrativeCluster[] {
  const enriched = stories.map((s) => ({
    ...s,
    narrativeTheme: s.narrativeTheme ?? detectNarrativeTheme(s),
    narrativeEntities: s.narrativeEntities ?? extractEntities(s),
  }));

  const parent: number[] = enriched.map((_, i) => i);

  function find(i: number): number {
    if (parent[i] !== i) parent[i] = find(parent[i]);
    return parent[i];
  }

  function union(i: number, j: number): void {
    const ri = find(i);
    const rj = find(j);
    if (ri !== rj) parent[rj] = ri;
  }

  for (let i = 0; i < enriched.length; i++) {
    for (let j = i + 1; j < enriched.length; j++) {
      if (shouldCluster(enriched[i], enriched[j])) union(i, j);
    }
  }

  const groups = new Map<number, Story[]>();
  for (let i = 0; i < enriched.length; i++) {
    const root = find(i);
    const list = groups.get(root) ?? [];
    list.push(enriched[i]);
    groups.set(root, list);
  }

  const clusters: NarrativeCluster[] = [];

  for (const [, group] of groups) {
    clusters.push(buildClusterFromStoryGroup(group));
  }

  return clusters.sort(
    (a, b) =>
      b.corroborationScore * b.size - a.corroborationScore * a.size ||
      (b.representative.importanceScore ?? 0) -
        (a.representative.importanceScore ?? 0)
  );
}

export function attachClusterMetadata(
  stories: Story[],
  clusters: NarrativeCluster[]
): Story[] {
  const repSlugs = new Set(
    clusters.map((c) => c.representative.slug)
  );

  const bySlug = new Map<string, NarrativeCluster>();
  for (const cluster of clusters) {
    for (const s of cluster.stories) {
      bySlug.set(s.slug, cluster);
    }
  }

  return stories.map((story) => {
    const cluster = bySlug.get(story.slug);
    if (!cluster) return story;

    return {
      ...story,
      narrativeClusterId: cluster.id,
      narrativeTheme: story.narrativeTheme ?? cluster.theme,
      narrativeEntities: story.narrativeEntities ?? extractEntities(story),
      clusterSize: cluster.size,
      corroborationScore: cluster.corroborationScore,
      isClusterRepresentative: repSlugs.has(story.slug),
    };
  });
}

/** One story per narrative cluster — for feeds and weekly synthesis. */
export function pickClusterRepresentatives(
  stories: Story[],
  limit: number
): Story[] {
  const clusters = buildNarrativeClusters(stories);
  return clusters.slice(0, limit).map((c) => ({
    ...c.representative,
    clusterSize: c.size,
    corroborationScore: c.corroborationScore,
    isClusterRepresentative: true,
  }));
}
