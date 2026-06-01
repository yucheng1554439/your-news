import "server-only";

import { detectNarrativeTheme } from "@/lib/editorial/narrative-clusters";
import { THEME_LABELS } from "@/lib/briefing/narrative-synthesis";
import {
  computeBehaviorConfidence,
  computeBehaviorWeight,
} from "@/lib/personalization/behavior-blend";
import {
  entitiesInStory,
  entityLabel,
} from "@/lib/personalization/entity-signals";
import type { ReadingSignalsMetadata } from "@/lib/personalization/reading-signals-metadata";
import { totalDwellMs } from "@/lib/personalization/reading-signals-metadata";
import {
  categoryDisplayLabel,
  tagDisplayLabel,
  topStoryCategoryLabel,
} from "@/lib/personalization/tag-labels";
import type {
  EntityWeight,
  SecondaryTagWeight,
  TagWeight,
  ThemeWeight,
  UserIntelligenceProfile,
} from "@/lib/personalization/user-intelligence-types";
import type { SavedStoryRef } from "@/lib/saved-stories/metadata";
import type { OnboardingProfile, Story } from "@/lib/types";

export type { UserIntelligenceProfile, ThemeWeight, TagWeight, EntityWeight };

const INTEREST_TO_TAGS: Record<string, string[]> = {
  ai: ["ai-infrastructure", "semiconductors", "enterprise-ai", "ai", "open-source-ai"],
  markets: ["markets", "investing", "banking-financial"],
  energy: ["energy"],
  geopolitics: ["geopolitics"],
  cybersecurity: ["cybersecurity"],
  startups: ["startups", "enterprise-ai"],
  policy: ["policy"],
  developer: ["developer-tools", "ai-infrastructure", "open-source-ai"],
};

const INTEREST_TO_THEME: Record<string, string> = {
  ai: "ai-capex",
  markets: "fed-rates",
  energy: "energy-commodities",
  geopolitics: "geopolitics-conflict",
  cybersecurity: "cyber-breach",
  startups: "big-tech-ai",
  policy: "policy-regulation",
  developer: "ai-capex",
};

const CAREER_ANCHOR_TAGS: Record<
  NonNullable<OnboardingProfile["career"]>,
  string[]
> = {
  engineer: [
    "ai-infrastructure",
    "semiconductors",
    "developer-tools",
    "open-source-ai",
    "cloud-infrastructure",
    "cybersecurity",
  ],
  investor: ["markets", "investing", "semiconductors", "energy", "policy"],
  founder: ["startups", "enterprise-ai", "markets", "policy"],
  executive: ["geopolitics", "policy", "markets", "energy"],
  researcher: ["science", "ai-infrastructure", "policy", "energy"],
};

/** Require sustained evidence before these become identity labels. */
const SENSITIVE_ENTITY_IDS = new Set(["oil", "defense"]);
const SENSITIVE_THEME_IDS = new Set([
  "energy-commodities",
  "humanitarian-social",
]);

const LOW_ENGAGEMENT_CATEGORIES = new Set(["sports", "entertainment", "gaming"]);

const MIN_CONFIDENCE_BEHAVIOR_IDENTITY = 0.42;
const MIN_CONFIDENCE_EMERGING = 0.38;

/** Durable desk themes inferred from repeated saves — not single accidental clicks. */
const COMPOSITE_SAVE_THEMES: {
  theme: string;
  label: string;
  tags: string[];
  entities?: string[];
  narrativeThemes?: string[];
  minHits: number;
}[] = [
  {
    theme: "ai-infrastructure-desk",
    label: "AI Infrastructure",
    tags: [
      "ai-infrastructure",
      "semiconductors",
      "enterprise-ai",
      "open-source-ai",
      "cloud-infrastructure",
      "developer-tools",
    ],
    entities: [
      "nvidia",
      "amd",
      "tsmc",
      "intel",
      "openai",
      "datacenter",
      "microsoft",
      "google",
      "amazon",
    ],
    narrativeThemes: ["ai-capex", "nvidia-semis", "hyperscaler-cloud", "big-tech-ai"],
    minHits: 2,
  },
  {
    theme: "infrastructure-risk-desk",
    label: "Infrastructure Risk",
    tags: ["energy", "infrastructure", "supply-chain", "geopolitics", "policy"],
    narrativeThemes: ["energy-commodities", "geopolitics-conflict", "policy-regulation"],
    minHits: 2,
  },
  {
    theme: "capital-markets-desk",
    label: "Capital Markets",
    tags: ["markets", "investing", "banking-financial"],
    narrativeThemes: ["fed-rates", "banking-financial"],
    minHits: 2,
  },
];

function deriveCompositeThemesFromSaves(
  savedRefs: SavedStoryRef[],
  pool: Story[]
): ThemeWeight[] {
  if (savedRefs.length === 0) return [];

  const tagHits = new Map<string, number>();
  const entityHits = new Map<string, number>();
  const themeHits = new Map<string, number>();

  for (const ref of savedRefs) {
    const story = pool.find((s) => s.slug === ref.slug);
    if (!story) continue;
    for (const tag of story.strategicTags ?? story.tags) {
      tagHits.set(tag, (tagHits.get(tag) ?? 0) + 1);
    }
    for (const id of entitiesInStory(story)) {
      entityHits.set(id, (entityHits.get(id) ?? 0) + 1);
    }
    themeHits.set(
      themeFromStory(story),
      (themeHits.get(themeFromStory(story)) ?? 0) + 1
    );
  }

  const derived: ThemeWeight[] = [];

  for (const rule of COMPOSITE_SAVE_THEMES) {
    let hits = 0;
    for (const tag of rule.tags) hits += tagHits.get(tag) ?? 0;
    for (const id of rule.entities ?? []) hits += entityHits.get(id) ?? 0;
    for (const nt of rule.narrativeThemes ?? []) hits += themeHits.get(nt) ?? 0;

    if (hits >= rule.minHits || (savedRefs.length >= 2 && hits >= 1)) {
      derived.push({
        theme: rule.theme,
        label: rule.label,
        score: 10 + hits * 2,
        sources: ["saved"],
      });
    }
  }

  return derived.sort((a, b) => b.score - a.score);
}

function themeFromStory(story: Story): string {
  return story.narrativeTheme ?? detectNarrativeTheme(story);
}

function accumulateTheme(
  map: Map<string, ThemeWeight>,
  theme: string,
  delta: number,
  source: ThemeWeight["sources"][number]
): void {
  const label = THEME_LABELS[theme as keyof typeof THEME_LABELS] ?? theme;
  const prev = map.get(theme);
  if (prev) {
    prev.score += delta;
    if (!prev.sources.includes(source)) prev.sources.push(source);
  } else {
    map.set(theme, { theme, label, score: delta, sources: [source] });
  }
}

function accumulateTag(map: Map<string, number>, tag: string, delta: number): void {
  map.set(tag, (map.get(tag) ?? 0) + delta);
}

function accumulateEntity(map: Map<string, number>, story: Story, delta: number): void {
  for (const id of entitiesInStory(story)) {
    map.set(id, (map.get(id) ?? 0) + delta);
  }
}

function careerLabel(career: OnboardingProfile["career"]): string {
  const map: Record<NonNullable<OnboardingProfile["career"]>, string> = {
    investor: "investor",
    engineer: "engineer",
    founder: "founder",
    executive: "executive",
    researcher: "researcher",
  };
  return career ? map[career] : "reader";
}

function interestDisplayLabel(interest: string): string {
  const labels: Record<string, string> = {
    ai: "AI",
    markets: "Markets",
    energy: "Energy",
    geopolitics: "Geopolitics",
    cybersecurity: "Cybersecurity",
    startups: "Startups",
    policy: "Policy",
    developer: "Developer",
  };
  return labels[interest] ?? interest;
}

function seedStableIdentity(
  profile: OnboardingProfile,
  themeMap: Map<string, ThemeWeight>,
  tagMap: Map<string, number>
): void {
  for (const interest of profile.interests) {
    const theme = INTEREST_TO_THEME[interest] ?? interest;
    accumulateTheme(themeMap, theme, 4, "interest");
    for (const tag of INTEREST_TO_TAGS[interest] ?? [interest]) {
      accumulateTag(tagMap, tag, 3.5);
    }
  }

  if (profile.career) {
    for (const tag of CAREER_ANCHOR_TAGS[profile.career]) {
      accumulateTag(tagMap, tag, 3);
    }
    const careerTheme =
      profile.career === "engineer"
        ? "ai-capex"
        : profile.career === "investor"
          ? "fed-rates"
          : profile.career === "researcher"
            ? "policy-regulation"
            : "policy-regulation";
    accumulateTheme(themeMap, careerTheme, 3.5, "interest");
  }
}

function entityEngagementCounts(
  entityId: string,
  savedRefs: SavedStoryRef[],
  reading: ReadingSignalsMetadata,
  pool: Story[]
): { saves: number; deepOpens: number } {
  let saves = 0;
  let deepOpens = 0;
  for (const ref of savedRefs) {
    const story = pool.find((s) => s.slug === ref.slug);
    if (story && entitiesInStory(story).includes(entityId)) saves += 1;
  }
  for (const open of reading.opens) {
    if ((open.dwellMs ?? 0) < 30_000) continue;
    const story = pool.find((s) => s.slug === open.slug);
    if (story && entitiesInStory(story).includes(entityId)) deepOpens += 1;
  }
  return { saves, deepOpens };
}

function qualifiesSensitiveEntity(
  id: string,
  score: number,
  saves: number,
  deepOpens: number
): boolean {
  if (!SENSITIVE_ENTITY_IDS.has(id)) {
    return score >= 2.5 && (saves > 0 || deepOpens >= 1);
  }
  return score >= 8 && (saves >= 1 || deepOpens >= 3);
}

function qualifiesPrimaryTheme(
  theme: ThemeWeight,
  profile: OnboardingProfile,
  behaviorConfidence: number
): boolean {
  if (theme.sources.includes("interest")) return true;
  if (theme.sources.includes("saved")) return true;

  const interestThemes = new Set(
    profile.interests.map((i) => INTEREST_TO_THEME[i] ?? i)
  );
  if (interestThemes.has(theme.theme)) return true;

  if (SENSITIVE_THEME_IDS.has(theme.theme)) {
    return (
      behaviorConfidence >= 0.55 &&
      theme.sources.includes("saved") &&
      theme.score >= 7
    );
  }

  if (behaviorConfidence >= MIN_CONFIDENCE_BEHAVIOR_IDENTITY) {
    if (theme.sources.includes("saved")) return true;
    if (theme.sources.includes("open") && theme.score >= 5) return true;
  }

  return false;
}

function buildEffectiveLens(
  profile: OnboardingProfile,
  primaryThemes: ThemeWeight[],
  primaryTags: TagWeight[],
  behaviorConfidence: number
): string {
  const career = careerLabel(profile.career);
  const interestLabels = profile.interests.map(interestDisplayLabel);

  if (behaviorConfidence < MIN_CONFIDENCE_BEHAVIOR_IDENTITY) {
    return `${career} · ${interestLabels.join(" & ") || "your interests"}`;
  }

  const anchored = primaryThemes
    .filter(
      (t) =>
        t.sources.includes("interest") ||
        t.sources.includes("saved") ||
        (behaviorConfidence >= 0.5 && t.score >= 5)
    )
    .slice(0, 2)
    .map((t) => t.label);

  const tagLabels = primaryTags
    .filter((t) => t.score >= 5)
    .slice(0, 2)
    .map((t) => t.label);

  const focus =
    interestLabels.length > 0
      ? interestLabels.slice(0, 2).join(" & ")
      : "your interests";

  if (anchored.length === 0 && tagLabels.length === 0) {
    return `${career} · ${focus}`;
  }

  const behaviorHint =
    anchored.length > 0 ? anchored.join(" · ") : tagLabels.join(" · ");
  return `${career} · ${focus} · ${behaviorHint}`;
}

export function buildUserIntelligenceProfile(
  profile: OnboardingProfile,
  savedRefs: SavedStoryRef[],
  reading: ReadingSignalsMetadata,
  pool: Story[]
): UserIntelligenceProfile {
  const themeMap = new Map<string, ThemeWeight>();
  const tagMap = new Map<string, number>();
  const secondaryMap = new Map<string, number>();
  const entityMap = new Map<string, number>();
  const categoryMap = new Map<string, number>();

  const savedSlugs = savedRefs.map((r) => r.slug);
  const openedSlugs = reading.opens.map((o) => o.slug);
  const aiIrrelevant = reading.aiIrrelevantSlugs ?? {};

  seedStableIdentity(profile, themeMap, tagMap);

  for (const ref of savedRefs) {
    const story = pool.find((s) => s.slug === ref.slug);
    if (!story) continue;
    accumulateTheme(themeMap, themeFromStory(story), 10, "saved");
    for (const tag of story.strategicTags ?? story.tags) accumulateTag(tagMap, tag, 7);
    for (const label of story.secondaryTags ?? []) {
      secondaryMap.set(label, (secondaryMap.get(label) ?? 0) + 6);
    }
    accumulateEntity(entityMap, story, 7);
    categoryMap.set(story.category, (categoryMap.get(story.category) ?? 0) + 6);
  }

  for (const composite of deriveCompositeThemesFromSaves(savedRefs, pool)) {
    accumulateTheme(themeMap, composite.theme, composite.score, "saved");
    const existing = themeMap.get(composite.theme);
    if (existing) existing.label = composite.label;
  }

  for (const open of reading.opens) {
    const story = pool.find((s) => s.slug === open.slug);
    if (!story) continue;
    if ((aiIrrelevant[story.slug] ?? 0) > 0) continue;

    const dwellMs = open.dwellMs ?? 0;
    const dwellFactor =
      dwellMs >= 60_000 ? 1 : dwellMs >= 30_000 ? 0.55 : dwellMs >= 10_000 ? 0.2 : 0.05;
    if (dwellFactor < 0.08) continue;

    const isDeep = dwellMs >= 30_000;
    const themeDelta = isDeep ? 2.5 * dwellFactor : 0.55 * dwellFactor;
    const tagDelta = isDeep ? 1.4 * dwellFactor : 0.25 * dwellFactor;

    accumulateTheme(themeMap, themeFromStory(story), themeDelta, "open");
    for (const tag of story.strategicTags ?? story.tags) {
      accumulateTag(tagMap, tag, tagDelta);
    }
    for (const label of story.secondaryTags ?? []) {
      secondaryMap.set(
        label,
        (secondaryMap.get(label) ?? 0) + (isDeep ? 1.2 : 0.25) * dwellFactor
      );
    }
    accumulateEntity(entityMap, story, (isDeep ? 1.5 : 0.35) * dwellFactor);
    categoryMap.set(
      story.category,
      (categoryMap.get(story.category) ?? 0) + (isDeep ? 1.2 : 0.35) * dwellFactor
    );
  }

  for (const [tag, score] of Object.entries(reading.savedTagScores)) {
    accumulateTag(tagMap, tag, score * 1.4);
  }
  for (const [tag, score] of Object.entries(reading.tagScores)) {
    accumulateTag(tagMap, tag, score * 0.2);
  }

  for (const [cat, count] of Object.entries(reading.categoryClicks)) {
    if (cat === "all") continue;
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + count * 0.25);
  }

  if (reading.refreshCount > 0) {
    for (const [cat, count] of Object.entries(reading.categoryClicks)) {
      if (cat === "all") continue;
      categoryMap.set(
        cat,
        (categoryMap.get(cat) ?? 0) + reading.refreshCount * 0.08 * count
      );
    }
  }

  const categoryEngagements = Object.values(reading.categoryClicks).reduce(
    (a, b) => a + b,
    0
  );

  const behaviorConfidence = computeBehaviorConfidence({
    savedCount: savedRefs.length,
    openCount: reading.opens.length,
    refreshCount: reading.refreshCount,
    categoryEngagements,
    totalDwellMs: totalDwellMs(reading),
    sessionCount: reading.sessions.length,
  });

  const rankedThemes = [...themeMap.values()].sort((a, b) => b.score - a.score);

  const primaryThemes = rankedThemes
    .filter((t) => qualifiesPrimaryTheme(t, profile, behaviorConfidence))
    .slice(0, 6);

  const primaryThemeIds = new Set(primaryThemes.map((t) => t.theme));

  const secondaryThemes = rankedThemes
    .filter(
      (t) =>
        !primaryThemeIds.has(t.theme) &&
        t.sources.includes("open") &&
        !t.sources.includes("saved") &&
        t.score >= 1.2 &&
        behaviorConfidence >= 0.25
    )
    .slice(0, 6);

  const allTags = [...tagMap.entries()].sort((a, b) => b[1] - a[1]);

  const primaryTags: TagWeight[] = allTags
    .filter(([, score]) => score >= 4.5)
    .slice(0, 8)
    .map(([tag, score]) => ({
      tag,
      label: tagDisplayLabel(tag),
      score,
    }));

  const primaryTagSet = new Set(primaryTags.map((t) => t.tag));
  const secondaryTags: TagWeight[] = allTags
    .filter(([tag, score]) => !primaryTagSet.has(tag) && score >= 1.2)
    .slice(0, 8)
    .map(([tag, score]) => ({
      tag,
      label: tagDisplayLabel(tag),
      score,
    }));

  const topSecondaryTags: SecondaryTagWeight[] = [...secondaryMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, score]) => ({ label, score }));

  const topCategories = [...categoryMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([category, score]) => ({
      category,
      label:
        category in { ai: 1, markets: 1, energy: 1 }
          ? topStoryCategoryLabel(category)
          : categoryDisplayLabel(category),
      score,
    }));

  const entityScores = [...entityMap.entries()].sort((a, b) => b[1] - a[1]);

  const primaryEntities: EntityWeight[] = [];
  const secondaryEntities: EntityWeight[] = [];

  for (const [id, score] of entityScores) {
    const { saves, deepOpens } = entityEngagementCounts(
      id,
      savedRefs,
      reading,
      pool
    );
    const entry = { id, label: entityLabel(id), score };
    if (qualifiesSensitiveEntity(id, score, saves, deepOpens)) {
      primaryEntities.push(entry);
    } else if (score >= 1.5 && (saves > 0 || deepOpens >= 1)) {
      secondaryEntities.push(entry);
    }
  }

  const behavioralTopTags = new Set(primaryTags.map((t) => t.tag));
  const behavioralTopCats = new Set(topCategories.map((c) => c.category));

  const ignoredCategories: string[] = [];
  for (const [cat, ignores] of Object.entries(reading.categoryIgnores)) {
    if (ignores >= 2 && !behavioralTopCats.has(cat)) {
      ignoredCategories.push(topStoryCategoryLabel(cat));
    }
  }
  for (const cat of LOW_ENGAGEMENT_CATEGORIES) {
    const clicks = reading.categoryClicks[cat] ?? 0;
    const opensInCat = reading.opens.filter((o) => o.category === cat).length;
    if (clicks >= 1 && opensInCat === 0 && !behavioralTopCats.has(cat)) {
      ignoredCategories.push(topStoryCategoryLabel(cat));
    }
  }

  const ignoredThemes: string[] = [];
  for (const [slug, count] of Object.entries(aiIrrelevant)) {
    if (count > 0) {
      const story = pool.find((s) => s.slug === slug);
      if (story) {
        ignoredThemes.push(story.headline.slice(0, 40));
      }
    }
  }

  const emergingInterests: string[] = [];
  if (behaviorConfidence >= MIN_CONFIDENCE_EMERGING) {
    for (const t of secondaryThemes) {
      if (
        !SENSITIVE_THEME_IDS.has(t.theme) &&
        !primaryThemeIds.has(t.theme) &&
        t.score >= 1.5 &&
        t.score < 4
      ) {
        emergingInterests.push(t.label);
      }
    }
    for (const e of secondaryEntities.slice(0, 3)) {
      if (
        !SENSITIVE_ENTITY_IDS.has(e.id) &&
        !emergingInterests.includes(e.label)
      ) {
        emergingInterests.push(e.label);
      }
    }
  }

  const behaviorWeight = computeBehaviorWeight(
    behaviorConfidence,
    savedRefs.length
  );

  const effectiveLens = buildEffectiveLens(
    profile,
    primaryThemes,
    primaryTags,
    behaviorConfidence
  );

  return {
    primaryThemes,
    secondaryThemes,
    topThemes: primaryThemes,
    dominantThemes: primaryThemes,
    primaryTags,
    secondaryTags,
    topTags: primaryTags,
    topSecondaryTags,
    topCategories,
    primaryEntities,
    secondaryEntities,
    topEntities: primaryEntities,
    ignoredThemes: [...new Set(ignoredThemes)].slice(0, 6),
    ignoredCategories: [...new Set(ignoredCategories)].slice(0, 6),
    emergingInterests: [...new Set(emergingInterests)].slice(0, 5),
    effectiveLens,
    behaviorConfidence,
    behaviorWeight,
    savedSlugs,
    openedSlugs,
    refreshCount: reading.refreshCount,
    totalDwellMs: totalDwellMs(reading),
    sessionCount: reading.sessions.length,
    aiIrrelevantSlugs: { ...aiIrrelevant },
  };
}

export function formatIntelligenceProfileForPrompt(
  uip: UserIntelligenceProfile
): string {
  const weightPct = (uip.behaviorWeight * 100).toFixed(0);
  const confPct = (uip.behaviorConfidence * 100).toFixed(0);

  const lines = [
    "USER INTELLIGENCE PROFILE (stable identity + behavior adjustment):",
    `- Effective lens: ${uip.effectiveLens}`,
    `- Behavior confidence: ${confPct}% · behavioral weight in ranking: ${weightPct}%`,
    "Career and onboarding interests are STABLE IDENTITY. Saved stories are the strongest signal — the feed should feel trained by intentional saves.",
  ];

  const primary = uip.primaryThemes ?? uip.topThemes;
  if (primary.length > 0) {
    lines.push(
      `- Primary themes: ${primary.map((t) => t.label).join(", ")}`
    );
  }
  if (uip.secondaryThemes?.length) {
    lines.push(
      `- Secondary themes (recent): ${uip.secondaryThemes.map((t) => t.label).join(", ")}`
    );
  }
  if (uip.primaryTags?.length || uip.topTags.length > 0) {
    const tags = uip.primaryTags ?? uip.topTags;
    lines.push(
      `- Primary tags: ${tags
        .slice(0, 6)
        .map((t) => t.label)
        .join(", ")}`
    );
  }
  if (uip.emergingInterests.length > 0) {
    lines.push(`- Emerging (watch): ${uip.emergingInterests.join(", ")}`);
  }
  if (uip.ignoredThemes.length > 0 || uip.ignoredCategories.length > 0) {
    lines.push(
      `- Deprioritized: ${[...uip.ignoredThemes, ...uip.ignoredCategories].join(", ")}`
    );
  }

  lines.push(
    "- Write For You as if briefing this specific person — anchor to primary identity first."
  );

  return lines.join("\n");
}
