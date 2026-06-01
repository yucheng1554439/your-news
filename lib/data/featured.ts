import { compareByEditorialImportance, isCriticalForDisplay } from "@/lib/importance-scoring";
import { isCriticalForUser } from "@/lib/personalization/importance";
import { isLeadCandidate } from "@/lib/editorial/lead-eligibility";
import { intelligenceDeclaresLowValue } from "@/lib/intelligence/irrelevance";
import { isNoiseStory } from "@/lib/signal/strategic-score";
import {
  computeStrategicRelevance,
  compareStrategicRelevance,
  passesLeadStoryGate,
} from "@/lib/ranking/strategic-relevance";
import { signalsFromProfile } from "@/lib/personalization/signals";
import { behaviorSignalsFromIntelligence } from "@/lib/personalization/behavior-signals";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import type { OnboardingProfile, Story } from "@/lib/types";

export function getFeaturedStory(
  stories: Story[],
  profile?: OnboardingProfile | null,
  personalized = false,
  intelligence?: UserIntelligenceProfile | null
): Story | undefined {
  const editorialEligible = stories.filter(
    (s) =>
      isLeadCandidate(s) &&
      !isNoiseStory(s) &&
      !intelligenceDeclaresLowValue(s)
  );

  if (personalized && profile?.completed) {
    const strategicEligible = editorialEligible
      .map((story) => ({
        story,
        breakdown: computeStrategicRelevance(story, profile, intelligence),
      }))
      .filter(({ breakdown }) => passesLeadStoryGate(breakdown))
      .sort((a, b) => compareStrategicRelevance(a.breakdown, b.breakdown));

    if (strategicEligible.length > 0) {
      const signals = signalsFromProfile(
        profile,
        behaviorSignalsFromIntelligence(intelligence)
      );
      const critical = strategicEligible.find(({ story }) =>
        isCriticalForUser(story, signals, intelligence)
      );
      return critical?.story ?? strategicEligible[0]!.story;
    }

    const relaxed = stories
      .filter((s) => !isNoiseStory(s) && !intelligenceDeclaresLowValue(s))
      .map((story) => ({
        story,
        breakdown: computeStrategicRelevance(story, profile, intelligence),
      }))
      .filter(({ breakdown }) => breakdown.composite >= 0.42)
      .sort((a, b) => compareStrategicRelevance(a.breakdown, b.breakdown));

    if (relaxed.length > 0) return relaxed[0]!.story;

    const bestAvailable = stories
      .filter((s) => !isNoiseStory(s) && !intelligenceDeclaresLowValue(s))
      .map((story) => ({
        story,
        breakdown: computeStrategicRelevance(story, profile, intelligence),
      }))
      .sort((a, b) => compareStrategicRelevance(a.breakdown, b.breakdown));

    if (bestAvailable.length > 0) return bestAvailable[0]!.story;
  }

  if (editorialEligible.length === 0) {
    const fallback = stories.filter(
      (s) => !isNoiseStory(s) && !intelligenceDeclaresLowValue(s)
    );
    if (fallback.length === 0) return stories[0];
    return [...fallback].sort(compareByEditorialImportance)[0];
  }

  const critical = editorialEligible.find((s) => isCriticalForDisplay(s));
  if (critical) return critical;

  return editorialEligible[0];
}
