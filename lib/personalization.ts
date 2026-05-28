import { mixFeedByDomain } from "@/lib/feed/domain-buckets";
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
  const mixed = mixFeedByDomain(ranked, { limit: limit ?? 48, picksPerDomain: 2 });
  return limit ? mixed.slice(0, limit) : mixed;
}

export function getGlobalStories(stories: Story[], limit?: number): Story[] {
  const ranked = rankStoriesGlobal(stories);
  const mixed = mixFeedByDomain(ranked, { limit: limit ?? 48, picksPerDomain: 2 });
  return limit ? mixed.slice(0, limit) : mixed;
}
