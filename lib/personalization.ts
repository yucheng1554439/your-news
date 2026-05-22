import {
  computeUserRelevanceScore,
  rankStoriesForUser,
  rankStoriesGlobal,
} from "@/lib/personalization/engine";
import type { OnboardingProfile } from "@/lib/types";
import type { Story } from "@/lib/types";

export { computeUserRelevanceScore } from "@/lib/personalization/engine";

/** @deprecated Use computeUserRelevanceScore */
export function scoreStoryRelevance(
  story: Story,
  profile: OnboardingProfile
): number {
  return computeUserRelevanceScore(story, profile);
}

export function getPersonalizedStories(
  profile: OnboardingProfile,
  stories: Story[],
  limit?: number
): Story[] {
  const ranked = rankStoriesForUser(stories, profile);
  return limit ? ranked.slice(0, limit) : ranked;
}

export function getGlobalStories(stories: Story[]): Story[] {
  return rankStoriesGlobal(stories);
}
