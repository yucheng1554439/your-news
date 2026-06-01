import { compareByEditorialImportance } from "@/lib/importance-scoring";
import {
  computePersonalizedImportance,
  personalizedImportanceLabel,
} from "@/lib/personalization/importance";
import { signalsFromProfile } from "@/lib/personalization/signals";
import { behaviorSignalsFromIntelligence } from "@/lib/personalization/behavior-signals";
import {
  assessStoryRelevance,
  relevanceFeedMultiplier,
} from "@/lib/personalization/relevance-gate";
import {
  computeWeightedPersonalization,
  failsSavedDeskGate,
  scoreSavedChannel,
} from "@/lib/personalization/signal-blend";
import {
  computeStrategicRelevance,
  compareStrategicRelevance,
  passesFeedStrategicGate,
} from "@/lib/ranking/strategic-relevance";
import { computeSemanticRelevance } from "@/lib/personalization/relevance";
import { getStrategicSignal, isLowSignalStory, isNoiseStory } from "@/lib/signal/strategic-score";
import type { ReadingSignalsMetadata } from "@/lib/personalization/reading-signals-metadata";
import { isHardTopicExcluded } from "@/lib/personalization/topic-preferences";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import type { OnboardingProfile, Story } from "@/lib/types";

const MS_PER_HOUR = 60 * 60 * 1000;

function recencyBoost(publishedAt: string, now = Date.now()): number {
  const ageH = (now - new Date(publishedAt).getTime()) / MS_PER_HOUR;
  if (ageH <= 6) return 1;
  if (ageH <= 24) return 0.6;
  if (ageH <= 72) return 0.3;
  return 0;
}

export function attachPersonalizedImportance(
  stories: Story[],
  profile: OnboardingProfile,
  intelligence?: UserIntelligenceProfile | null
): Story[] {
  const signals = signalsFromProfile(
    profile,
    behaviorSignalsFromIntelligence(intelligence)
  );
  return stories.map((story) => {
    const score = computePersonalizedImportance(story, signals, intelligence);
    const label = personalizedImportanceLabel(score, story);
    return {
      ...story,
      personalizedImportanceScore: score,
      personalizedImportanceLabel: label,
    };
  });
}

export function computeUserRelevanceScore(
  story: Story,
  profile: OnboardingProfile,
  intelligence?: UserIntelligenceProfile | null,
  reading?: ReadingSignalsMetadata | null
): number {
  if (isNoiseStory(story)) return 0;

  const strategicBreakdown = computeStrategicRelevance(
    story,
    profile,
    intelligence,
    reading
  );

  if (strategicBreakdown.aiDemoted) return 0;

  const personalization = computeWeightedPersonalization(
    story,
    profile,
    intelligence,
    reading
  );

  if (failsSavedDeskGate(story, personalization)) return 0;

  const recency = recencyBoost(story.publishedAt);
  const editorial = (story.importanceScore ?? 5) * 0.15;

  const assessment = assessStoryRelevance(story, profile, intelligence, {
    personalization,
  });

  const core =
    strategicBreakdown.composite * 22 +
    strategicBreakdown.highValueMatch * 4 +
    recency +
    editorial;

  return core * relevanceFeedMultiplier(assessment);
}

export function rankStoriesForUser(
  stories: Story[],
  profile: OnboardingProfile,
  intelligence?: UserIntelligenceProfile | null,
  reading?: ReadingSignalsMetadata | null
): Story[] {
  const savedTrained = (intelligence?.savedSlugs.length ?? 0) > 0;
  const minRelevance = savedTrained ? 0.35 : 1.5;

  const rankable = stories.filter((s) => {
    if (isNoiseStory(s)) return false;
    if (isHardTopicExcluded(s, profile, intelligence)) return false;
    if (getStrategicSignal(s) < 0.28) return false;
    if (isLowSignalStory(s) && getStrategicSignal(s) < 0.38) return false;

    const breakdown = computeStrategicRelevance(
      s,
      profile,
      intelligence,
      reading
    );
    if (breakdown.aiDemoted) return false;
    if (!passesFeedStrategicGate(breakdown)) return false;

    const personalization = computeWeightedPersonalization(
      s,
      profile,
      intelligence,
      reading
    );
    if (failsSavedDeskGate(s, personalization)) return false;

    const assessment = assessStoryRelevance(s, profile, intelligence, {
      personalization,
    });
    if (!assessment.passesFeed) return false;

    if (savedTrained) {
      if (breakdown.composite >= 0.28) return true;
      if (scoreSavedChannel(s, intelligence) >= 0.2) return true;
      if (computeSemanticRelevance(s, profile) >= minRelevance) return true;
      return false;
    }

    return computeSemanticRelevance(s, profile) >= minRelevance;
  });

  const withScores = attachPersonalizedImportance(rankable, profile, intelligence);
  return [...withScores].sort((a, b) => {
    const aSr = computeStrategicRelevance(a, profile, intelligence, reading);
    const bSr = computeStrategicRelevance(b, profile, intelligence, reading);
    const srDiff = compareStrategicRelevance(aSr, bSr);
    if (srDiff !== 0) return srDiff;

    const diff =
      computeUserRelevanceScore(b, profile, intelligence, reading) -
      computeUserRelevanceScore(a, profile, intelligence, reading);
    if (diff !== 0) return diff;
    return compareByEditorialImportance(a, b);
  });
}

export function rankStoriesGlobal(stories: Story[]): Story[] {
  const rankable = stories.filter(
    (s) => !isNoiseStory(s) && getStrategicSignal(s) >= 0.22
  );
  return [...rankable].sort(compareByEditorialImportance);
}
