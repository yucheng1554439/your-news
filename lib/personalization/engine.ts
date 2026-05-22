import { compareByEditorialImportance } from "@/lib/importance-scoring";
import type { OnboardingProfile } from "@/lib/types";
import type { Story, StoryCategory } from "@/lib/types";

const MS_PER_HOUR = 60 * 60 * 1000;

const INTEREST_MAP: Record<string, StoryCategory[]> = {
  ai: ["ai", "technology", "developer"],
  markets: ["markets", "energy"],
  energy: ["energy", "markets"],
  geopolitics: ["geopolitics", "policy"],
  cybersecurity: ["cybersecurity", "developer", "technology"],
  startups: ["startups", "ai", "technology"],
  policy: ["policy", "geopolitics"],
  technology: ["technology", "ai", "developer"],
  developer: ["developer", "technology", "ai"],
};

const CAREER_LENS: Record<
  NonNullable<OnboardingProfile["career"]>,
  StoryCategory[]
> = {
  engineer: ["ai", "developer", "technology", "cybersecurity"],
  investor: ["markets", "energy", "geopolitics", "policy"],
  founder: ["startups", "ai", "markets", "policy"],
  executive: ["markets", "geopolitics", "policy", "ai"],
  researcher: ["ai", "technology", "policy"],
};

const CAREER_KEYWORDS: Record<
  NonNullable<OnboardingProfile["career"]>,
  RegExp
> = {
  engineer: /\b(code|api|cloud|chip|model|software|data|cyber)\b/i,
  investor: /\b(stock|market|fed|rate|fund|ipo|bond|earnings|valuation)\b/i,
  founder: /\b(startup|venture|funding|competitor|regulation|growth)\b/i,
  executive: /\b(policy|regulation|enterprise|geopolitic|merger|board)\b/i,
  researcher: /\b(study|research|trial|policy|science|evidence)\b/i,
};

function recencyBoost(publishedAt: string, now = Date.now()): number {
  const ageH = (now - new Date(publishedAt).getTime()) / MS_PER_HOUR;
  if (ageH <= 1) return 4;
  if (ageH <= 6) return 3;
  if (ageH <= 24) return 2;
  if (ageH <= 72) return 1;
  return 0;
}

function interestAlignment(story: Story, profile: OnboardingProfile): number {
  let score = 0;
  const blob = `${story.headline} ${story.summary}`.toLowerCase();

  for (const interest of profile.interests) {
    const cats = INTEREST_MAP[interest] ?? [];
    if (cats.includes(story.category)) score += 3;
    if (blob.includes(interest.toLowerCase())) score += 1.5;
  }
  return score;
}

function careerAlignment(story: Story, profile: OnboardingProfile): number {
  if (!profile.career) return 0;
  const lens = CAREER_LENS[profile.career];
  let score = lens.includes(story.category) ? 3.5 : 0;
  const kw = CAREER_KEYWORDS[profile.career];
  if (kw?.test(`${story.headline} ${story.summary}`)) score += 2;
  return score;
}

function focusAlignment(story: Story, profile: OnboardingProfile): number {
  if (profile.focusType === "breaking") {
    const fresh = recencyBoost(story.publishedAt);
    const critical =
      story.importanceLabel === "Critical" ? 2 : 0;
    return fresh + critical;
  }
  if (profile.focusType === "depth" && story.readTime >= 6) return 1.5;
  if (profile.focusType === "breadth") return 0.5;
  return 0;
}

/**
 * Adaptive relevance score — powers feed ranking (not UI labels).
 */
export function computeUserRelevanceScore(
  story: Story,
  profile: OnboardingProfile
): number {
  const editorial = (story.importanceScore ?? 5) * 1.2;
  const recency = recencyBoost(story.publishedAt);
  const interests = interestAlignment(story, profile);
  const career = careerAlignment(story, profile);
  const focus = focusAlignment(story, profile);
  const topic = (story.importanceScore ?? 5) * 0.15;

  return editorial + recency + interests + career + focus + topic;
}

export function rankStoriesForUser(
  stories: Story[],
  profile: OnboardingProfile
): Story[] {
  return [...stories].sort((a, b) => {
    const diff =
      computeUserRelevanceScore(b, profile) -
      computeUserRelevanceScore(a, profile);
    if (diff !== 0) return diff;
    return compareByEditorialImportance(a, b);
  });
}

export function rankStoriesGlobal(stories: Story[]): Story[] {
  return [...stories].sort((a, b) => {
    const recencyDiff = recencyBoost(b.publishedAt) - recencyBoost(a.publishedAt);
    if (recencyDiff !== 0) return recencyDiff;
    return compareByEditorialImportance(a, b);
  });
}
