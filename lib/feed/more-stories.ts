import {
  compareStrategicRelevance,
  computeStrategicRelevance,
  passesFeedStrategicGate,
} from "@/lib/ranking/strategic-relevance";
import { isNoiseStory } from "@/lib/signal/strategic-score";
import { isHardTopicExcluded } from "@/lib/personalization/topic-preferences";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import type { OnboardingProfile, Story } from "@/lib/types";

/**
 * Remaining homepage feed after Lead, Relevant, and Top Stories — sorted by
 * strategic relevance using existing story metadata (no new AI calls).
 */
export function selectMoreStoriesForFeed(
  stories: Story[],
  excludeSlugs: Set<string>,
  profile: OnboardingProfile,
  intelligence?: UserIntelligenceProfile | null,
  personalized = true
): Story[] {
  const candidates = stories.filter(
    (story) => !excludeSlugs.has(story.slug) && !isNoiseStory(story)
  );

  return candidates
    .map((story) => ({
      story,
      breakdown: computeStrategicRelevance(story, profile, intelligence),
    }))
    .filter(
      ({ story, breakdown }) =>
        !isHardTopicExcluded(story, profile, intelligence) &&
        (personalized
          ? passesFeedStrategicGate(breakdown)
          : !breakdown.aiDemoted &&
            !(breakdown.lowValueContent && breakdown.composite < 0.28))
    )
    .sort((a, b) => compareStrategicRelevance(a.breakdown, b.breakdown))
    .map(({ story }) => story);
}
