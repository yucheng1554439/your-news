import { scoreStoryForReader } from "@/lib/briefing/reader-scoring";
import { intelligenceDeclaresLowValue } from "@/lib/intelligence/irrelevance";
import { computeSemanticRelevance } from "@/lib/personalization/relevance";
import {
  computeStrategicRelevance,
  passesFeedStrategicGate,
  passesRelevantToYouStrategicGate,
  passesTopStoriesGate,
} from "@/lib/ranking/strategic-relevance";
import {
  computeWeightedPersonalization,
  type WeightedPersonalization,
} from "@/lib/personalization/signal-blend";
import {
  isHardTopicExcluded,
  shouldOverrideTopicExclusion,
  topicPreferenceAdjustments,
} from "@/lib/personalization/topic-preferences";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import {
  getStrategicSignal,
  isLowSignalStory,
  isNoiseStory,
} from "@/lib/signal/strategic-score";
import type { OnboardingProfile, Story } from "@/lib/types";

/** Composite 0–1 gates — tuned so consumer/airline fluff fails before intelligence. */
export const RELEVANCE_THRESHOLDS = {
  intelligence: 0.44,
  relevantToYou: 0.52,
  feed: 0.3,
  /** High strategic stories may enter feed despite weak profile match. */
  strategicBypass: 0.48,
} as const;

const CONSUMER_SERVICE =
  /\b(southwest|united airlines|american airlines|delta air|airline|airlines|seat policy|baggage fee|carry-on|flight delay|holiday travel|hotel loyalty|cruise line|rental car|theme park)\b/i;

const STRATEGIC_OVERRIDE =
  /\b(merger|acquisition|antitrust|regulation|earnings|bankruptcy|strike|union|supply chain|fuel cost|billion|stock fell|stock rose|fda|congress)\b/i;

export type RelevanceAssessment = {
  /** 0–1 composite — same judgment used for feed, Relevant, and intelligence gates. */
  composite: number;
  strategic: number;
  profile: number;
  behavioral: number;
  /** Unified strategic relevance score */
  strategicRelevance: number;
  actionability: number;
  passesFeed: boolean;
  passesRelevantToYou: boolean;
  passesIntelligence: boolean;
  aiDeclaresIrrelevant: boolean;
  reasons: string[];
};

export type RelevanceGateOptions = {
  savedSlugs?: string[];
  /** User explicitly saved — always allow intelligence. */
  forceIntelligence?: boolean;
  personalization?: WeightedPersonalization;
};

function storyBlob(story: Story): string {
  return `${story.headline} ${story.summary} ${story.rawExcerpt ?? ""}`;
}

function normalizeBehavior(
  story: Story,
  profile: OnboardingProfile,
  intelligence?: UserIntelligenceProfile | null
): number {
  if (!intelligence || intelligence.behaviorWeight <= 0) return 0;
  const raw = scoreStoryForReader(story, profile, intelligence);
  return Math.min(1, raw / 12);
}

export function assessStoryRelevance(
  story: Story,
  profile: OnboardingProfile,
  intelligence?: UserIntelligenceProfile | null,
  options: RelevanceGateOptions = {}
): RelevanceAssessment {
  const reasons: string[] = [];
  const savedSlugs = options.savedSlugs ?? intelligence?.savedSlugs ?? [];
  const isSaved = savedSlugs.includes(story.slug);

  if (isNoiseStory(story)) {
    return {
      composite: 0,
      strategic: getStrategicSignal(story),
      profile: 0,
      behavioral: 0,
      strategicRelevance: 0,
      actionability: 0,
      passesFeed: false,
      passesRelevantToYou: false,
      passesIntelligence: false,
      aiDeclaresIrrelevant: false,
      reasons: ["noise"],
    };
  }

  const aiDeclaresIrrelevant = intelligenceDeclaresLowValue(story);
  const priorIrrelevant =
    (intelligence?.aiIrrelevantSlugs?.[story.slug] ?? 0) > 0;

  const strategic = getStrategicSignal(story);
  const profileScore = computeSemanticRelevance(story, profile) / 10;
  const personalization =
    options.personalization ??
    computeWeightedPersonalization(story, profile, intelligence);
  const savedAffinity = personalization.channels.saved;
  const blob = storyBlob(story);
  const topicAdj = topicPreferenceAdjustments(story, profile);

  let behavioral = normalizeBehavior(story, profile, intelligence);
  if (topicAdj.hardExcluded) {
    behavioral = 0;
  } else if (topicAdj.penalty > 0) {
    behavioral *= 0.35;
  }

  let composite =
    savedAffinity * 0.4 +
    personalization.channels.deepRead * 0.25 +
    profileScore * 0.2 +
    personalization.channels.recentOpen * 0.1 +
    personalization.channels.refresh * 0.05 +
    behavioral * 0.08 +
    strategic * 0.12;

  if (isSaved) {
    composite = Math.min(1, composite + 0.35);
    reasons.push("saved by user");
  } else if (savedAffinity >= 0.35) {
    composite = Math.min(1, composite + savedAffinity * 0.25);
    reasons.push("matches saved desk");
  }

  if (isLowSignalStory(story)) {
    composite *= 0.35;
    reasons.push("low-signal category");
  }

  if (CONSUMER_SERVICE.test(blob) && !STRATEGIC_OVERRIDE.test(blob)) {
    composite *= 0.18;
    reasons.push("consumer/travel service — outside core lanes");
  }

  if (aiDeclaresIrrelevant || priorIrrelevant) {
    composite *= 0.04;
    reasons.push("AI declared off-profile");
  }

  if (profile.career === "engineer" || profile.interests.includes("ai")) {
    if (CONSUMER_SERVICE.test(blob) && strategic < 0.35) {
      composite *= 0.12;
      reasons.push("no AI/infra angle for this reader");
    }
  }

  composite = Math.min(1, Math.max(0, composite));

  const strategicBreakdown = computeStrategicRelevance(
    story,
    profile,
    intelligence
  );
  composite = Math.min(
    1,
    composite * 0.55 + strategicBreakdown.composite * 0.45
  );

  composite = Math.min(
    1,
    Math.max(0, composite + topicAdj.boost - topicAdj.penalty)
  );

  const topicOverride = shouldOverrideTopicExclusion(
    story,
    profile,
    intelligence
  );
  const topicBlocked =
    topicAdj.hardExcluded && !topicOverride && !isSaved;

  if (topicAdj.boost > 0) reasons.push("topic interest boost");
  if (topicAdj.penalty > 0) reasons.push("topic less-interested penalty");
  if (topicBlocked) reasons.push("topic never-show exclusion");

  let passesFeed =
    !topicBlocked &&
    (composite >= RELEVANCE_THRESHOLDS.feed ||
      strategicBreakdown.strategicSignificance >=
        RELEVANCE_THRESHOLDS.strategicBypass) &&
    passesFeedStrategicGate(strategicBreakdown);

  let passesRelevantToYou =
    !topicBlocked &&
    !aiDeclaresIrrelevant &&
    !priorIrrelevant &&
    passesRelevantToYouStrategicGate(strategicBreakdown) &&
    (isSaved ||
      savedAffinity >= 0.32 ||
      composite >= RELEVANCE_THRESHOLDS.relevantToYou);

  const passesIntelligence =
    !aiDeclaresIrrelevant &&
    (options.forceIntelligence ||
      isSaved ||
      composite >= RELEVANCE_THRESHOLDS.intelligence ||
      (strategic >= 0.55 && profileScore >= 0.18) ||
      (behavioral >= 0.55 && composite >= 0.32));

  if (passesIntelligence && !isSaved) {
    reasons.push(`composite=${composite.toFixed(2)}`);
  }
  if (!passesIntelligence && !isSaved) {
    reasons.push(`below intelligence threshold (${composite.toFixed(2)})`);
  }

  return {
    composite,
    strategic,
    profile: profileScore,
    behavioral,
    strategicRelevance: strategicBreakdown.composite,
    actionability: strategicBreakdown.actionability,
    passesFeed,
    passesRelevantToYou,
    passesIntelligence,
    aiDeclaresIrrelevant: aiDeclaresIrrelevant || priorIrrelevant,
    reasons,
  };
}

export function passesIntelligenceGate(
  story: Story,
  profile: OnboardingProfile | null,
  intelligence?: UserIntelligenceProfile | null,
  options: RelevanceGateOptions = {}
): boolean {
  if (!profile?.completed) {
    return !isNoiseStory(story) && getStrategicSignal(story) >= 0.28;
  }
  return assessStoryRelevance(story, profile, intelligence, options)
    .passesIntelligence;
}

export function passesRelevantToYouGate(
  story: Story,
  profile: OnboardingProfile,
  intelligence?: UserIntelligenceProfile | null,
  options: RelevanceGateOptions = {}
): boolean {
  return assessStoryRelevance(story, profile, intelligence, options)
    .passesRelevantToYou;
}

export function relevanceFeedMultiplier(
  assessment: RelevanceAssessment
): number {
  if (!assessment.passesFeed) return 0;
  return 0.35 + assessment.composite * 0.65;
}

export function logRelevanceSkip(
  context: string,
  story: Story,
  assessment: RelevanceAssessment
): void {
  console.log(
    `[RELEVANCE_GATE] ${context}`,
    JSON.stringify({
      slug: story.slug,
      headline: story.headline.slice(0, 72),
      composite: assessment.composite,
      strategic: assessment.strategic,
      profile: assessment.profile,
      behavioral: assessment.behavioral,
      passesIntelligence: assessment.passesIntelligence,
      reasons: assessment.reasons,
    })
  );
}

/** Top N stories for the Relevant To You row — stricter than general feed. */
export function selectRelevantStoriesForUser(
  stories: Story[],
  profile: OnboardingProfile,
  intelligence?: UserIntelligenceProfile | null,
  limit = 4,
  options: RelevanceGateOptions = {}
): Story[] {
  return stories
    .map((story) => ({
      story,
      breakdown: computeStrategicRelevance(story, profile, intelligence),
      assessment: assessStoryRelevance(story, profile, intelligence, options),
    }))
    .filter(
      ({ story, assessment, breakdown }) =>
        !isHardTopicExcluded(story, profile, intelligence) &&
        assessment.passesRelevantToYou &&
        passesRelevantToYouStrategicGate(breakdown)
    )
    .sort(
      (a, b) =>
        b.breakdown.composite - a.breakdown.composite ||
        b.assessment.composite - a.assessment.composite
    )
    .slice(0, limit)
    .map(({ story }) => story);
}

/** Top Stories row — high strategic relevance, not merely editorial order. */
export function selectTopStoriesForUser(
  stories: Story[],
  profile: OnboardingProfile,
  intelligence?: UserIntelligenceProfile | null,
  limit = 6
): Story[] {
  return stories
    .map((story) => ({
      story,
      breakdown: computeStrategicRelevance(story, profile, intelligence),
    }))
    .filter(
      ({ story, breakdown }) =>
        !isHardTopicExcluded(story, profile, intelligence) &&
        passesTopStoriesGate(breakdown)
    )
    .sort((a, b) => b.breakdown.composite - a.breakdown.composite)
    .slice(0, limit)
    .map(({ story }) => story);
}
