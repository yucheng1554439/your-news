import {
  getStrategicSignal,
  isLowSignalStory,
} from "@/lib/signal/strategic-score";
import { storyMatchesThematicTag } from "@/lib/intelligence/thematic-tags";
import { computeSemanticRelevance } from "@/lib/personalization/relevance";
import type { OnboardingProfile, Story } from "@/lib/types";
import type { PersonalizationSignals } from "@/lib/personalization/signals";

const CAREER_TAG_BOOST: Record<
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
  founder: ["startups", "investing", "enterprise-ai", "markets", "policy"],
  executive: ["geopolitics", "policy", "markets", "energy"],
  researcher: ["science", "ai", "policy", "energy"],
};

function interestAlignment(story: Story, profile: OnboardingProfile): number {
  return computeSemanticRelevance(story, profile) * 0.85;
}

export function computePersonalizedImportance(
  story: Story,
  signals: PersonalizationSignals
): number {
  const { profile, behavior } = signals;

  if (isLowSignalStory(story)) {
    return Math.min(3, story.importanceScore ?? 3);
  }

  const global = story.importanceScore ?? 5;
  const strategic = getStrategicSignal(story);

  let personal = global * 0.4 + strategic * 4;

  personal += interestAlignment(story, profile);

  if (profile.career) {
    const careerTags = CAREER_TAG_BOOST[profile.career];
    const hits = careerTags.filter((t) => storyMatchesThematicTag(story, t)).length;
    personal += hits * 1.2;
  }

  if (behavior?.savedSlugs?.includes(story.slug)) personal += 1;
  if (behavior?.skippedSlugs?.includes(story.slug)) personal -= 1.5;

  return Math.round(Math.min(10, Math.max(1, personal)));
}

export function personalizedImportanceLabel(score: number): string {
  if (score >= 9) return "Critical";
  if (score >= 7) return "High";
  if (score >= 4) return "Moderate";
  return "Low";
}

export function isCriticalForUser(
  story: Story,
  signals: PersonalizationSignals
): boolean {
  if (isLowSignalStory(story)) return false;
  return computePersonalizedImportance(story, signals) >= 9;
}
