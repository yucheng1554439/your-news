import { compareByEditorialImportance } from "@/lib/importance-scoring";
import { computeSemanticRelevance } from "@/lib/personalization/relevance";
import { getStrategicSignal, isLowSignalStory } from "@/lib/signal/strategic-score";
import { storyMatchesThematicTag } from "@/lib/intelligence/thematic-tags";
import {
  computePersonalizedImportance,
  personalizedImportanceLabel,
} from "@/lib/personalization/importance";
import { signalsFromProfile } from "@/lib/personalization/signals";
import type { OnboardingProfile } from "@/lib/types";
import type { EditorialImportanceLabel, Story } from "@/lib/types";

const MS_PER_HOUR = 60 * 60 * 1000;

const CAREER_TAGS: Record<
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
  founder: ["startups", "markets", "policy", "enterprise-ai"],
  executive: ["geopolitics", "policy", "markets", "energy"],
  researcher: ["science", "ai", "policy", "energy"],
};

function recencyBoost(publishedAt: string, now = Date.now()): number {
  const ageH = (now - new Date(publishedAt).getTime()) / MS_PER_HOUR;
  if (ageH <= 6) return 1;
  if (ageH <= 24) return 0.6;
  if (ageH <= 72) return 0.3;
  return 0;
}

function thematicAlignment(story: Story, profile: OnboardingProfile): number {
  return computeSemanticRelevance(story, profile);
}

function careerAlignment(story: Story, profile: OnboardingProfile): number {
  if (!profile.career) return 0;
  const tags = CAREER_TAGS[profile.career];
  return tags.filter((t) => storyMatchesThematicTag(story, t)).length * 1.8;
}

export function attachPersonalizedImportance(
  stories: Story[],
  profile: OnboardingProfile
): Story[] {
  const signals = signalsFromProfile(profile);
  return stories.map((story) => {
    const score = computePersonalizedImportance(story, signals);
    const label = personalizedImportanceLabel(score);
    return {
      ...story,
      personalizedImportanceScore: score,
      personalizedImportanceLabel: label as EditorialImportanceLabel,
    };
  });
}

export function computeUserRelevanceScore(
  story: Story,
  profile: OnboardingProfile
): number {
  if (isLowSignalStory(story)) return 0;

  const signals = signalsFromProfile(profile);
  const personalImportance = computePersonalizedImportance(story, signals);
  const strategic = getStrategicSignal(story) * 5;
  const thematic = thematicAlignment(story, profile);
  const career = careerAlignment(story, profile);
  const recency = recencyBoost(story.publishedAt);

  return (
    strategic * 2.2 +
    personalImportance * 2 +
    thematic +
    career +
    recency +
    (story.importanceScore ?? 5) * 0.25
  );
}

export function rankStoriesForUser(
  stories: Story[],
  profile: OnboardingProfile
): Story[] {
  const rankable = stories.filter((s) => {
    if (isLowSignalStory(s) && getStrategicSignal(s) < 0.35) return false;
    return computeSemanticRelevance(s, profile) >= 1.5;
  });
  const withScores = attachPersonalizedImportance(rankable, profile);
  return [...withScores].sort((a, b) => {
    const diff =
      computeUserRelevanceScore(b, profile) -
      computeUserRelevanceScore(a, profile);
    if (diff !== 0) return diff;
    return compareByEditorialImportance(a, b);
  });
}

export function rankStoriesGlobal(stories: Story[]): Story[] {
  const rankable = stories.filter((s) => !isLowSignalStory(s));
  return [...rankable].sort(compareByEditorialImportance);
}
