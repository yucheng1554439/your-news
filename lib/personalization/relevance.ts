import { getStorySourceTier } from "@/lib/editorial/source-authority";
import { extractEntities, detectNarrativeTheme } from "@/lib/editorial/narrative-clusters";
import type { OnboardingProfile, Story } from "@/lib/types";

const GAMING_PATTERN =
  /\b(video game|gaming|playstation|xbox|nintendo|fortnite|esports|gamer|dlc|game trailer)\b/i;

const CONSUMER_PROMO =
  /\b(merchandise|giveaway|black friday|cyber monday|coupon|red carpet|box office)\b/i;

/** Granular tags only — category "technology" does not count. */
const INTEREST_SEMANTIC_TAGS: Record<string, string[]> = {
  ai: [
    "ai-infrastructure",
    "semiconductors",
    "enterprise-ai",
    "open-source-ai",
    "ai",
  ],
  markets: ["markets", "investing", "semiconductors"],
  energy: ["energy", "infrastructure", "supply-chain"],
  geopolitics: ["geopolitics", "policy", "supply-chain"],
  cybersecurity: ["cybersecurity", "enterprise-ai", "infrastructure"],
  startups: ["startups", "investing", "enterprise-ai"],
  policy: ["policy", "geopolitics"],
  developer: [
    "developer-tools",
    "open-source-ai",
    "cloud-infrastructure",
    "ai-infrastructure",
  ],
};

const CAREER_SEMANTIC_TAGS: Record<
  NonNullable<OnboardingProfile["career"]>,
  string[]
> = {
  engineer: [
    "ai-infrastructure",
    "semiconductors",
    "developer-tools",
    "open-source-ai",
    "cloud-infrastructure",
    "cybersecurity",
  ],
  investor: ["markets", "investing", "semiconductors", "energy", "policy"],
  founder: ["startups", "enterprise-ai", "cloud-infrastructure", "ai-infrastructure", "policy"],
  executive: ["geopolitics", "policy", "markets", "energy"],
  researcher: ["science", "ai-infrastructure", "policy", "energy"],
};

const CAREER_THEME_AFFINITY: Record<
  NonNullable<OnboardingProfile["career"]>,
  string[]
> = {
  engineer: ["nvidia-semis", "ai-capex", "hyperscaler-cloud", "big-tech-ai"],
  investor: ["fed-rates", "banking-financial", "nvidia-semis", "geopolitics-conflict"],
  founder: ["big-tech-ai", "ai-capex", "hyperscaler-cloud", "policy-regulation"],
  executive: ["geopolitics-conflict", "policy-regulation", "fed-rates"],
  researcher: ["policy-regulation", "ai-capex", "energy-commodities"],
};

function matchesSemanticTag(story: Story, tag: string): boolean {
  if (story.tags.includes(tag)) return true;
  if (tag === "science" && story.tags.includes("science")) return true;
  return false;
}

function interestSemanticScore(story: Story, profile: OnboardingProfile): number {
  let score = 0;
  for (const interest of profile.interests) {
    const tags = INTEREST_SEMANTIC_TAGS[interest] ?? [];
    for (const tag of tags) {
      if (matchesSemanticTag(story, tag)) score += 2.5;
    }
    if (interest === "ai" && story.tags.includes("gaming")) {
      score -= 4;
    }
    if (interest === "ai" && story.tags.includes("consumer-tech") && !story.tags.includes("ai-infrastructure")) {
      score -= 1.5;
    }
  }
  return Math.max(0, score);
}

function careerSemanticScore(story: Story, profile: OnboardingProfile): number {
  if (!profile.career) return 0;
  let score = 0;
  const tags = CAREER_SEMANTIC_TAGS[profile.career];
  for (const tag of tags) {
    if (matchesSemanticTag(story, tag)) score += 2;
  }
  const theme = story.narrativeTheme ?? detectNarrativeTheme(story);
  if (CAREER_THEME_AFFINITY[profile.career]?.includes(theme)) {
    score += 2.5;
  }
  if (profile.career === "engineer" && GAMING_PATTERN.test(story.headline)) {
    score -= 5;
  }
  return Math.max(0, score);
}

function practicalRelevancePenalty(story: Story, profile: OnboardingProfile): number {
  let penalty = 0;
  const blob = `${story.headline} ${story.summary}`;

  if (GAMING_PATTERN.test(blob) && profile.career === "engineer") {
    penalty += 5;
  }
  if (CONSUMER_PROMO.test(blob)) penalty += 3;
  if (getStorySourceTier(story) === 3) penalty += 2;
  if (story.tags.includes("gaming") && profile.interests.includes("ai")) {
    penalty += 3;
  }

  return penalty;
}

/** 0–10 semantic + strategic fit for this reader (not broad category overlap). */
export function computeSemanticRelevance(
  story: Story,
  profile: OnboardingProfile
): number {
  const interest = interestSemanticScore(story, profile);
  const career = careerSemanticScore(story, profile);
  const penalty = practicalRelevancePenalty(story, profile);
  const corroboration = (story.corroborationScore ?? 0) * 2;
  const clusterBoost = (story.clusterSize ?? 1) > 1 ? 1.2 : 0;
  const authority =
    getStorySourceTier(story) === 1 ? 1 : getStorySourceTier(story) === 2 ? 0.4 : 0;

  const raw =
    interest + career + corroboration + clusterBoost + authority - penalty;

  return Math.max(0, Math.min(10, raw));
}

export function storyMatchesReaderInterest(
  story: Story,
  profile: OnboardingProfile
): boolean {
  return computeSemanticRelevance(story, profile) >= 2.5;
}
