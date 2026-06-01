import {
  filterStoriesByCategory,
  type TopStoryCategory,
} from "@/lib/feed/category-filter";
import { computeStrategicRelevance } from "@/lib/ranking/strategic-relevance";
import { topicPreferenceLabel } from "@/lib/personalization/topic-options";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import type { OnboardingProfile, Story, StoryCategory } from "@/lib/types";

export type TopicPreferences = {
  moreOf: string[];
  lessOf: string[];
  neverShow: string[];
};

export const DEFAULT_TOPIC_PREFERENCES: TopicPreferences = {
  moreOf: [],
  lessOf: [],
  neverShow: [],
};

/** High strategic significance can override a hard topic exclusion. */
export const TOPIC_EXCLUSION_OVERRIDE = {
  strategicSignificance: 0.72,
  strategicComposite: 0.68,
} as const;

const ENTERTAINMENT_PATTERN =
  /\b(celebrity|kardashian|reality tv|paparazzi|box office|red carpet|euphoria|streaming premiere|tv series|film festival|hollywood)\b/i;

const TOPIC_TO_CATEGORY: Partial<Record<string, StoryCategory>> = {
  ai: "ai",
  markets: "markets",
  energy: "energy",
  geopolitics: "geopolitics",
  cybersecurity: "cybersecurity",
  startups: "startups",
  policy: "policy",
  developer: "developer",
  technology: "technology",
};

const TOPIC_TO_FILTER: Partial<Record<string, TopStoryCategory>> = {
  ai: "ai",
  markets: "markets",
  energy: "energy",
  geopolitics: "geopolitics",
  cybersecurity: "cybersecurity",
  science: "science",
  sports: "sports",
};

export function normalizeTopicPreferences(
  prefs?: Partial<TopicPreferences> | null
): TopicPreferences {
  const moreOf = Array.isArray(prefs?.moreOf) ? [...prefs.moreOf] : [];
  const lessOf = Array.isArray(prefs?.lessOf) ? [...prefs.lessOf] : [];
  const neverShow = Array.isArray(prefs?.neverShow) ? [...prefs.neverShow] : [];

  const never = new Set(neverShow);
  return {
    moreOf: moreOf.filter((id) => !never.has(id)),
    lessOf: lessOf.filter((id) => !never.has(id) && !moreOf.includes(id)),
    neverShow: [...never],
  };
}

export function getTopicPreferences(
  profile: OnboardingProfile
): TopicPreferences {
  return normalizeTopicPreferences(profile.topicPreferences);
}

function isEntertainmentStory(story: Story): boolean {
  const blob = `${story.headline} ${story.summary} ${story.rawExcerpt ?? ""}`;
  return ENTERTAINMENT_PATTERN.test(blob);
}

function isScienceStory(story: Story): boolean {
  return filterStoriesByCategory([story], "science").length > 0;
}

function isSportsStory(story: Story): boolean {
  return filterStoriesByCategory([story], "sports").length > 0;
}

export function storyMatchesTopic(story: Story, topicId: string): boolean {
  const filterCategory = TOPIC_TO_FILTER[topicId];
  if (filterCategory) {
    return filterStoriesByCategory([story], filterCategory).length > 0;
  }

  const mappedCategory = TOPIC_TO_CATEGORY[topicId];
  if (mappedCategory && story.category === mappedCategory) return true;

  switch (topicId) {
    case "entertainment":
      return isEntertainmentStory(story);
    case "science":
      return isScienceStory(story);
    case "sports":
      return isSportsStory(story);
    default:
      return false;
  }
}

export function matchingTopicIds(
  story: Story,
  topicIds: string[]
): string[] {
  return topicIds.filter((topicId) => storyMatchesTopic(story, topicId));
}

export function topicPreferenceAdjustments(
  story: Story,
  profile: OnboardingProfile
): { boost: number; penalty: number; hardExcluded: boolean } {
  const prefs = getTopicPreferences(profile);
  const neverMatches = matchingTopicIds(story, prefs.neverShow);
  const moreMatches = matchingTopicIds(story, prefs.moreOf);
  const lessMatches = matchingTopicIds(story, prefs.lessOf);

  return {
    boost: moreMatches.length > 0 ? 0.18 : 0,
    penalty: lessMatches.length > 0 ? 0.24 : 0,
    hardExcluded: neverMatches.length > 0,
  };
}

export function shouldOverrideTopicExclusion(
  story: Story,
  profile: OnboardingProfile,
  intelligence?: UserIntelligenceProfile | null
): boolean {
  const breakdown = computeStrategicRelevance(story, profile, intelligence);
  return (
    breakdown.strategicSignificance >=
      TOPIC_EXCLUSION_OVERRIDE.strategicSignificance ||
    breakdown.composite >= TOPIC_EXCLUSION_OVERRIDE.strategicComposite
  );
}

export function isHardTopicExcluded(
  story: Story,
  profile: OnboardingProfile,
  intelligence?: UserIntelligenceProfile | null
): boolean {
  const { hardExcluded } = topicPreferenceAdjustments(story, profile);
  if (!hardExcluded) return false;
  return !shouldOverrideTopicExclusion(story, profile, intelligence);
}

export function topicPreferencesForDisplay(
  profile: OnboardingProfile
): {
  moreOf: string[];
  lessOf: string[];
  neverShow: string[];
} {
  const prefs = getTopicPreferences(profile);
  return {
    moreOf: prefs.moreOf.map(topicPreferenceLabel),
    lessOf: prefs.lessOf.map(topicPreferenceLabel),
    neverShow: prefs.neverShow.map(topicPreferenceLabel),
  };
}

export function mergeTopicPreferencesIntoIntelligence(
  profile: OnboardingProfile,
  uip: UserIntelligenceProfile
): UserIntelligenceProfile {
  const prefs = getTopicPreferences(profile);
  return {
    ...uip,
    topicPreferencesMore: prefs.moreOf.map(topicPreferenceLabel),
    topicPreferencesLess: prefs.lessOf.map(topicPreferenceLabel),
    topicPreferencesNever: prefs.neverShow.map(topicPreferenceLabel),
  };
}
