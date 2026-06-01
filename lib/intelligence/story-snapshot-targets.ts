import "server-only";

import { allStoriesFromSelection } from "@/lib/briefing/weekly-selection";
import type { WeeklyBriefingSelection } from "@/lib/briefing/weekly-selection";
import { getFeaturedStory } from "@/lib/data/featured";
import { getGlobalStories, getPersonalizedStories } from "@/lib/personalization";
import {
  assessStoryRelevance,
  logRelevanceSkip,
  passesIntelligenceGate,
} from "@/lib/personalization/relevance-gate";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import type { OnboardingProfile, Story } from "@/lib/types";

const DEFAULT_LIMIT = 30;
const TOP_FEED_LIMIT = 22;

/**
 * Stories that should have intelligence persisted in the platform snapshot after refresh.
 * Token spend is limited to profile-aligned, strategically relevant stories.
 */
export function selectStoryIntelligenceTargets(
  stories: Story[],
  profile: OnboardingProfile | null,
  savedSlugs: string[],
  briefingSelections: WeeklyBriefingSelection[],
  intelligence: UserIntelligenceProfile | null,
  limit = DEFAULT_LIMIT
): Story[] {
  const bySlug = new Map(stories.map((s) => [s.slug, s]));
  const ordered: Story[] = [];
  const seen = new Set<string>();
  const savedSet = new Set(savedSlugs);

  const add = (story: Story | undefined, opts?: { force?: boolean }) => {
    if (!story || seen.has(story.slug)) return;

    const force = opts?.force || savedSet.has(story.slug);
    if (
      profile?.completed &&
      !force &&
      !passesIntelligenceGate(story, profile, intelligence, { savedSlugs })
    ) {
      logRelevanceSkip(
        "skip intelligence target",
        story,
        assessStoryRelevance(story, profile, intelligence, { savedSlugs })
      );
      return;
    }

    seen.add(story.slug);
    ordered.push(story);
  };

  for (const sel of briefingSelections) {
    for (const story of allStoriesFromSelection(sel)) {
      add(bySlug.get(story.slug) ?? story);
    }
  }

  for (const slug of savedSlugs) {
    add(bySlug.get(slug), { force: true });
  }

  const feedRanked =
    profile?.completed
      ? getPersonalizedStories(profile, stories, TOP_FEED_LIMIT, intelligence)
      : getGlobalStories(stories, TOP_FEED_LIMIT);

  for (const story of feedRanked) {
    add(story);
  }

  add(
    getFeaturedStory(
      feedRanked.length > 0 ? feedRanked : stories,
      profile,
      Boolean(profile?.completed),
      intelligence
    )
  );

  for (const story of stories) {
    if (ordered.length >= limit) break;
    add(story);
  }

  return ordered.slice(0, limit);
}
