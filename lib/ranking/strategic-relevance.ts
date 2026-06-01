import { storyMatchesTag } from "@/lib/intelligence/story-tags";
import { entitiesInStory } from "@/lib/personalization/entity-signals";
import { computeSemanticRelevance } from "@/lib/personalization/relevance";
import {
  computeWeightedPersonalization,
  scoreSavedChannel,
} from "@/lib/personalization/signal-blend";
import type { ReadingSignalsMetadata } from "@/lib/personalization/reading-signals-metadata";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import {
  intelligenceDeclaresLowValue,
  intelligenceTextBlob,
} from "@/lib/intelligence/irrelevance";
import {
  getStrategicSignal,
  isNoiseStory,
} from "@/lib/signal/strategic-score";
import type { OnboardingProfile, Story } from "@/lib/types";

/** Minimum scores (0–1) for homepage placements. */
export const STRATEGIC_RELEVANCE_THRESHOLDS = {
  lead: {
    composite: 0.52,
    userRelevance: 0.42,
    strategic: 0.38,
    actionability: 0.35,
  },
  relevantToYou: {
    composite: 0.48,
    userRelevance: 0.35,
    actionability: 0.28,
  },
  topStories: {
    composite: 0.38,
    userRelevance: 0.28,
  },
  feed: {
    composite: 0.26,
  },
} as const;

const HIGH_VALUE_TAGS = [
  "ai-infrastructure",
  "semiconductors",
  "cloud-infrastructure",
  "enterprise-ai",
  "open-source-ai",
  "developer-tools",
  "markets",
  "investing",
  "energy",
  "geopolitics",
  "policy",
  "cybersecurity",
] as const;

const HIGH_VALUE_HEADLINE =
  /\b(ai infrastructure|semiconductor|nvidia|openai|anthropic|google ai|gemini|datacenter|data center|hyperscaler|cloud capex|llm|gpu|capital market|ipo\b|infrastructure spending|supply chain|energy infrastructure|ai regulation|export control|chip act|federal reserve|antitrust)\b/i;

const LOW_VALUE_CONTENT =
  /\b(celebrity|kardashian|reality tv|paparazzi|red carpet|box office|cruise (passenger|line|ship|quarantine)|hantavirus|local health|health scare|airline seat|seat policy|baggage fee|carry-on|flight delay|holiday travel|nfl\b|nba\b|mlb\b|sports score|touchdown|playoffs|entertainment news|viral video|feel-good|heartwarming)\b/i;

const STRATEGIC_OVERRIDE =
  /\b(merger|acquisition|antitrust|regulation|earnings|bankruptcy|strike|supply chain|billion|stock fell|stock rose|fda|congress|export control|ai regulation|infrastructure bill|opec|power grid)\b/i;

const ACTIONABLE_INTELLIGENCE =
  /\b(may affect|could affect|decision|exposure|timing|act on|positioning|watch for|material to|direct bearing|requires attention|infrastructure|capex|regulation|earnings|supply chain|second-order)\b/i;

const LOW_ACTIONABILITY =
  /\b(peripheral|indirect|not actionable|low priority|limited impact|unlikely to affect|tangential|does not require action|no immediate action|outside your lane|entertainment purposes|human interest)\b/i;

export type StrategicRelevanceBreakdown = {
  /** 0–1 unified ranking score */
  composite: number;
  userRelevance: number;
  strategicSignificance: number;
  actionability: number;
  savedAlignment: number;
  highValueMatch: number;
  aiDemoted: boolean;
  lowValueContent: boolean;
};

function storyBlob(story: Story): string {
  return `${story.headline} ${story.summary} ${story.rawExcerpt ?? ""}`;
}

function scoreHighValueMatch(
  story: Story,
  profile: OnboardingProfile
): number {
  let score = 0;
  const blob = storyBlob(story);

  if (HIGH_VALUE_HEADLINE.test(blob)) score += 0.45;

  for (const tag of HIGH_VALUE_TAGS) {
    if (storyMatchesTag(story, tag)) score += 0.12;
  }

  for (const id of entitiesInStory(story)) {
    if (
      ["nvidia", "openai", "google", "amazon", "microsoft", "datacenter"].includes(
        id
      )
    ) {
      score += 0.15;
    }
  }

  if (profile.career === "engineer" || profile.interests.includes("ai")) {
    if (storyMatchesTag(story, "ai-infrastructure")) score += 0.1;
    if (storyMatchesTag(story, "semiconductors")) score += 0.1;
  }

  return Math.min(1, score);
}

function isLowValueContent(story: Story): boolean {
  if (isNoiseStory(story)) return true;
  const blob = storyBlob(story);
  if (!LOW_VALUE_CONTENT.test(blob)) return false;
  if (STRATEGIC_OVERRIDE.test(blob)) return false;
  return getStrategicSignal(story) < 0.55;
}

function scoreActionability(story: Story): number {
  const intelBlob = intelligenceTextBlob(story);
  const headlineBlob = storyBlob(story);

  if (intelBlob && LOW_ACTIONABILITY.test(intelBlob)) return 0.08;
  if (intelBlob && intelligenceDeclaresLowValue(story)) return 0.06;

  let score = 0.35;

  if (intelBlob && ACTIONABLE_INTELLIGENCE.test(intelBlob)) {
    score += 0.35;
  }

  if (STRATEGIC_OVERRIDE.test(headlineBlob)) score += 0.2;
  score += getStrategicSignal(story) * 0.35;

  if ((story.importanceScore ?? 0) >= 8) score += 0.08;
  if ((story.clusterSize ?? 1) >= 2) score += 0.06;

  return Math.min(1, Math.max(0, score));
}

export function computeStrategicRelevance(
  story: Story,
  profile: OnboardingProfile,
  intelligence?: UserIntelligenceProfile | null,
  reading?: ReadingSignalsMetadata | null
): StrategicRelevanceBreakdown {
  if (isNoiseStory(story)) {
    return {
      composite: 0,
      userRelevance: 0,
      strategicSignificance: 0,
      actionability: 0,
      savedAlignment: 0,
      highValueMatch: 0,
      aiDemoted: true,
      lowValueContent: true,
    };
  }

  const personalization = computeWeightedPersonalization(
    story,
    profile,
    intelligence,
    reading
  );
  const semantic = computeSemanticRelevance(story, profile) / 10;
  const userRelevance = Math.min(
    1,
    personalization.composite * 0.62 + semantic * 0.38
  );

  const strategicSignificance = getStrategicSignal(story);
  const savedRaw = scoreSavedChannel(story, intelligence);
  const savedAlignment = Math.min(
    1,
    savedRaw +
      (intelligence?.savedSlugs.includes(story.slug) ? 0.35 : 0)
  );
  const actionability = scoreActionability(story);
  const highValueMatch = scoreHighValueMatch(story, profile);

  let composite =
    userRelevance * 0.35 +
    strategicSignificance * 0.3 +
    actionability * 0.2 +
    savedAlignment * 0.15;

  if (highValueMatch >= 0.25) {
    composite = Math.min(1, composite + highValueMatch * 0.14);
  }

  const aiDemoted = intelligenceDeclaresLowValue(story);
  const lowValueContent = isLowValueContent(story);

  if (aiDemoted) composite *= 0.04;
  else if (lowValueContent) composite *= 0.1;

  composite = Math.min(1, Math.max(0, composite));

  return {
    composite,
    userRelevance,
    strategicSignificance,
    actionability,
    savedAlignment,
    highValueMatch,
    aiDemoted,
    lowValueContent,
  };
}

export function passesLeadStoryGate(
  breakdown: StrategicRelevanceBreakdown
): boolean {
  if (breakdown.aiDemoted) return false;
  if (
    breakdown.lowValueContent &&
    breakdown.strategicSignificance < 0.55
  ) {
    return false;
  }

  const t = STRATEGIC_RELEVANCE_THRESHOLDS.lead;
  return (
    breakdown.composite >= t.composite &&
    breakdown.userRelevance >= t.userRelevance &&
    breakdown.strategicSignificance >= t.strategic &&
    breakdown.actionability >= t.actionability
  );
}

export function passesRelevantToYouStrategicGate(
  breakdown: StrategicRelevanceBreakdown
): boolean {
  if (breakdown.aiDemoted) return false;
  if (
    breakdown.lowValueContent &&
    breakdown.strategicSignificance < 0.5 &&
    breakdown.savedAlignment < 0.2
  ) {
    return false;
  }

  const t = STRATEGIC_RELEVANCE_THRESHOLDS.relevantToYou;
  return (
    breakdown.composite >= t.composite &&
    breakdown.userRelevance >= t.userRelevance &&
    breakdown.actionability >= t.actionability
  );
}

export function passesTopStoriesGate(
  breakdown: StrategicRelevanceBreakdown
): boolean {
  if (breakdown.aiDemoted) return false;
  if (breakdown.lowValueContent && breakdown.composite < 0.45) return false;

  const t = STRATEGIC_RELEVANCE_THRESHOLDS.topStories;
  return (
    breakdown.composite >= t.composite &&
    breakdown.userRelevance >= t.userRelevance
  );
}

export function passesFeedStrategicGate(
  breakdown: StrategicRelevanceBreakdown
): boolean {
  if (breakdown.aiDemoted) return false;
  if (breakdown.lowValueContent && breakdown.composite < 0.32) return false;
  return breakdown.composite >= STRATEGIC_RELEVANCE_THRESHOLDS.feed.composite;
}

export function compareStrategicRelevance(
  a: StrategicRelevanceBreakdown,
  b: StrategicRelevanceBreakdown
): number {
  return b.composite - a.composite;
}
