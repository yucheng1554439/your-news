import { mixFeedByDomain } from "@/lib/feed/domain-buckets";
import {
  computeUserRelevanceScore,
  rankStoriesForUser,
  rankStoriesGlobal,
} from "@/lib/personalization/engine";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import type { OnboardingProfile } from "@/lib/types";
import type { Story } from "@/lib/types";

export {
  computeUserRelevanceScore,
  rankStoriesForUser,
  rankStoriesGlobal,
} from "@/lib/personalization/engine";
export { selectRelevantStoriesForUser, selectTopStoriesForUser } from "@/lib/personalization/relevance-gate";
export { selectMoreStoriesForFeed } from "@/lib/feed/more-stories";

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
  limit?: number,
  intelligence?: UserIntelligenceProfile | null
): Story[] {
  const ranked = rankStoriesForUser(stories, profile, intelligence);
  const mixed = mixFeedByDomain(ranked, { limit: limit ?? 48, picksPerDomain: 2 });
  return limit ? mixed.slice(0, limit) : mixed;
}

export function getGlobalStories(stories: Story[], limit?: number): Story[] {
  const ranked = rankStoriesGlobal(stories);
  return limit ? ranked.slice(0, limit) : ranked;
}
