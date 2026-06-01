import { detectNarrativeTheme } from "@/lib/editorial/narrative-clusters";
import { storyMatchesTag } from "@/lib/intelligence/story-tags";
import { entitiesInStory } from "@/lib/personalization/entity-signals";
import { scoreSavedChannel } from "@/lib/personalization/signal-blend";
import {
  categoryDisplayLabel,
  tagDisplayLabel,
} from "@/lib/personalization/tag-labels";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import {
  getTopicPreferences,
  matchingTopicIds,
  topicPreferenceAdjustments,
} from "@/lib/personalization/topic-preferences";

import type { OnboardingProfile, Story } from "@/lib/types";

/** Rank boost from user intelligence profile (behavior > static interests). */
export function scoreStoryForReader(
  story: Story,
  profile: OnboardingProfile | null,
  intelligence?: UserIntelligenceProfile | null
): number {
  if (!intelligence || intelligence.behaviorWeight <= 0) return 0;

  const w = intelligence.behaviorWeight;
  const theme = story.narrativeTheme ?? detectNarrativeTheme(story);
  let score = 0;

  const primaryThemes = intelligence.primaryThemes ?? intelligence.topThemes;
  const dominant = primaryThemes.find((t) => t.theme === theme);
  if (dominant) {
    score += dominant.score * (0.9 + intelligence.behaviorConfidence);
  }

  for (const sec of intelligence.secondaryThemes ?? []) {
    if (sec.theme === theme) {
      score += sec.score * 0.22 * w;
    }
  }

  const primaryTags = intelligence.primaryTags ?? intelligence.topTags;
  for (const tw of primaryTags) {
    if (storyMatchesTag(story, tw.tag)) {
      score += tw.score * 0.35 * w;
    }
  }

  for (const tw of intelligence.secondaryTags ?? []) {
    if (storyMatchesTag(story, tw.tag)) {
      score += tw.score * 0.12 * w;
    }
  }

  for (const sec of intelligence.topSecondaryTags ?? []) {
    if (story.secondaryTags?.includes(sec.label)) {
      score += sec.score * 0.4 * w;
    }
  }

  const primaryEntities =
    intelligence.primaryEntities ?? intelligence.topEntities;
  for (const entity of primaryEntities) {
    if (entitiesInStory(story).includes(entity.id)) {
      score += entity.score * 0.45 * w;
    }
  }

  for (const entity of intelligence.secondaryEntities ?? []) {
    if (entitiesInStory(story).includes(entity.id)) {
      score += entity.score * 0.15 * w;
    }
  }

  for (const cat of intelligence.topCategories) {
    if (story.category === cat.category) {
      score += cat.score * 0.25 * w;
    }
  }

  if (intelligence.savedSlugs.includes(story.slug)) score += 12 * w;
  score += scoreSavedChannel(story, intelligence) * 10 * w;
  if (intelligence.openedSlugs.includes(story.slug)) score += 1.5 * w;

  if (profile) {
    const topicAdj = topicPreferenceAdjustments(story, profile);
    if (topicAdj.hardExcluded) {
      return score - 20 * w;
    }
    if (topicAdj.boost > 0) score += 4 * w;
    if (topicAdj.penalty > 0) score -= 5 * w;
  }

  const userWantsMore =
    profile != null &&
    matchingTopicIds(story, getTopicPreferences(profile).moreOf).length > 0;

  if (!userWantsMore) {
    for (const ignored of intelligence.ignoredThemes) {
      const needle = ignored.toLowerCase();
      if (
        story.tags.some((t) =>
          tagDisplayLabel(t).toLowerCase().includes(needle)
        ) ||
        theme === ignored
      ) {
        score -= 4 * w;
      }
    }

    for (const ignored of intelligence.ignoredCategories) {
      if (
        story.category === ignored.toLowerCase() ||
        categoryDisplayLabel(story.category)
          .toLowerCase()
          .includes(ignored.toLowerCase())
      ) {
        score -= 3.5 * w;
      }
    }
  }

  return score;
}
