import { detectNarrativeTheme } from "@/lib/editorial/narrative-clusters";
import { storyMatchesTag } from "@/lib/intelligence/story-tags";
import { entitiesInStory } from "@/lib/personalization/entity-signals";
import { computeSemanticRelevance } from "@/lib/personalization/relevance";
import type { ReadingSignalsMetadata } from "@/lib/personalization/reading-signals-metadata";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import type { OnboardingProfile, Story } from "@/lib/types";

/** Personalization channel weights when the user has intentional save history. */
export const SIGNAL_WEIGHTS = {
  saved: 0.4,
  deepRead: 0.25,
  onboarding: 0.2,
  recentOpen: 0.1,
  refresh: 0.05,
} as const;

const TABloid_OFF_DESK =
  /\b(hantavirus|celebrity|kardashian|reality tv|paparazzi|viral video|feel-good|heartwarming|local man|local woman|seat policy|baggage fee|carry-on fee|airline seat|flight delay|holiday travel tip|cruise line|quarantine.*cruise)\b/i;

export type PersonalizationChannels = {
  saved: number;
  deepRead: number;
  onboarding: number;
  recentOpen: number;
  refresh: number;
};

export type SignalWeightMap = {
  saved: number;
  deepRead: number;
  onboarding: number;
  recentOpen: number;
  refresh: number;
};

export type WeightedPersonalization = {
  composite: number;
  channels: PersonalizationChannels;
  weights: SignalWeightMap;
  savedTrained: boolean;
};

function deepOpenSlugs(reading?: ReadingSignalsMetadata | null): Set<string> {
  const slugs = new Set<string>();
  for (const open of reading?.opens ?? []) {
    if ((open.dwellMs ?? 0) >= 30_000) slugs.add(open.slug);
  }
  return slugs;
}

function recentOpenSlugs(
  reading?: ReadingSignalsMetadata | null,
  deepSlugs?: Set<string>
): Set<string> {
  const deep = deepSlugs ?? deepOpenSlugs(reading);
  const slugs = new Set<string>();
  for (const open of reading?.opens ?? []) {
    if ((open.dwellMs ?? 0) >= 10_000 && !deep.has(open.slug)) {
      slugs.add(open.slug);
    }
  }
  return slugs;
}

/** 0–1 — how closely a story matches what the user intentionally saved. */
export function scoreSavedChannel(
  story: Story,
  intelligence?: UserIntelligenceProfile | null
): number {
  if (!intelligence || intelligence.savedSlugs.length === 0) return 0;
  if (intelligence.savedSlugs.includes(story.slug)) return 1;

  const theme = story.narrativeTheme ?? detectNarrativeTheme(story);
  let score = 0;

  for (const t of intelligence.primaryThemes ?? intelligence.topThemes) {
    if (t.theme === theme) {
      score += t.sources.includes("saved") ? 0.42 : 0.22;
    }
  }

  for (const t of intelligence.secondaryThemes ?? []) {
    if (t.theme === theme && t.sources.includes("saved")) {
      score += 0.18;
    }
  }

  const primaryTags = intelligence.primaryTags ?? intelligence.topTags;
  for (const tw of primaryTags) {
    if (storyMatchesTag(story, tw.tag)) {
      const savedBoost = tw.score >= 8 ? 0.28 : 0.18;
      score += savedBoost * Math.min(1, tw.score / 12);
    }
  }

  for (const sec of intelligence.topSecondaryTags ?? []) {
    if (story.secondaryTags?.includes(sec.label) && sec.score >= 4) {
      score += 0.12;
    }
  }

  const storyEntities = entitiesInStory(story);
  for (const entity of intelligence.primaryEntities ?? intelligence.topEntities) {
    if (storyEntities.includes(entity.id)) score += 0.2;
  }

  for (const cat of intelligence.topCategories) {
    if (story.category === cat.category && cat.score >= 5) score += 0.14;
  }

  return Math.min(1, score);
}

export function scoreDeepReadChannel(
  story: Story,
  intelligence?: UserIntelligenceProfile | null,
  reading?: ReadingSignalsMetadata | null
): number {
  const deepSlugs = deepOpenSlugs(reading);
  if (deepSlugs.size === 0 && !intelligence?.openedSlugs.length) return 0;
  if (deepSlugs.has(story.slug)) return 1;

  if (!intelligence) return 0;

  const theme = story.narrativeTheme ?? detectNarrativeTheme(story);
  let score = 0;

  for (const t of intelligence.secondaryThemes ?? []) {
    if (t.theme === theme && t.sources.includes("open")) score += 0.25;
  }

  for (const tw of intelligence.secondaryTags ?? []) {
    if (storyMatchesTag(story, tw.tag)) {
      score += 0.2 * Math.min(1, tw.score / 6);
    }
  }

  for (const entity of intelligence.secondaryEntities ?? []) {
    if (entitiesInStory(story).includes(entity.id)) score += 0.15;
  }

  return Math.min(1, score);
}

export function scoreRecentOpenChannel(
  story: Story,
  intelligence?: UserIntelligenceProfile | null,
  reading?: ReadingSignalsMetadata | null
): number {
  const deep = deepOpenSlugs(reading);
  const recent = recentOpenSlugs(reading, deep);
  if (recent.size === 0) return 0;
  if (recent.has(story.slug)) return 1;

  if (!intelligence) return 0;

  const theme = story.narrativeTheme ?? detectNarrativeTheme(story);
  const hit = (intelligence.secondaryThemes ?? []).some(
    (t) => t.theme === theme && t.sources.includes("open")
  );
  return hit ? 0.35 : 0;
}

export function scoreOnboardingChannel(
  story: Story,
  profile: OnboardingProfile
): number {
  return computeSemanticRelevance(story, profile) / 10;
}

export function scoreRefreshChannel(
  story: Story,
  intelligence?: UserIntelligenceProfile | null
): number {
  if (!intelligence || intelligence.refreshCount <= 0) return 0;

  const catHit = intelligence.topCategories.find(
    (c) => c.category === story.category && c.score >= 2
  );
  if (!catHit) return 0;

  return Math.min(1, 0.35 + intelligence.refreshCount * 0.04 + catHit.score * 0.05);
}

export function effectiveSignalWeights(
  intelligence?: UserIntelligenceProfile | null,
  reading?: ReadingSignalsMetadata | null
): SignalWeightMap {
  const hasSaves = (intelligence?.savedSlugs.length ?? 0) > 0;
  const hasDeep = deepOpenSlugs(reading).size > 0;

  if (hasSaves) return SIGNAL_WEIGHTS;

  if (hasDeep) {
    return {
      saved: 0,
      deepRead: 0.35,
      onboarding: 0.35,
      recentOpen: 0.2,
      refresh: 0.1,
    };
  }

  return {
    saved: 0,
    deepRead: 0,
    onboarding: 0.65,
    recentOpen: 0.2,
    refresh: 0.15,
  };
}

export function computePersonalizationChannels(
  story: Story,
  profile: OnboardingProfile,
  intelligence?: UserIntelligenceProfile | null,
  reading?: ReadingSignalsMetadata | null
): PersonalizationChannels {
  return {
    saved: scoreSavedChannel(story, intelligence),
    deepRead: scoreDeepReadChannel(story, intelligence, reading),
    onboarding: scoreOnboardingChannel(story, profile),
    recentOpen: scoreRecentOpenChannel(story, intelligence, reading),
    refresh: scoreRefreshChannel(story, intelligence),
  };
}

export function computeWeightedPersonalization(
  story: Story,
  profile: OnboardingProfile,
  intelligence?: UserIntelligenceProfile | null,
  reading?: ReadingSignalsMetadata | null
): WeightedPersonalization {
  const channels = computePersonalizationChannels(
    story,
    profile,
    intelligence,
    reading
  );
  const weights = effectiveSignalWeights(intelligence, reading);
  const savedTrained = (intelligence?.savedSlugs.length ?? 0) > 0;

  const composite =
    channels.saved * weights.saved +
    channels.deepRead * weights.deepRead +
    channels.onboarding * weights.onboarding +
    channels.recentOpen * weights.recentOpen +
    channels.refresh * weights.refresh;

  return { composite, channels, weights, savedTrained };
}

/** When the user has trained the desk via saves, block tabloid/health fluff. */
export function failsSavedDeskGate(
  story: Story,
  personalization: WeightedPersonalization
): boolean {
  if (!personalization.savedTrained) return false;
  if (personalization.channels.saved >= 0.22) return false;
  if (personalization.channels.onboarding >= 0.45) return false;
  if (personalization.composite >= 0.38) return false;

  const blob = `${story.headline} ${story.summary}`;
  return TABloid_OFF_DESK.test(blob);
}
