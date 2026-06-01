import {
  getStrategicSignal,
  isNoiseStory,
  meetsCriticalBar,
} from "@/lib/signal/strategic-score";
import { storyMatchesTag } from "@/lib/intelligence/story-tags";
import { storyMatchesThematicTag } from "@/lib/intelligence/thematic-tags";
import { computeSemanticRelevance } from "@/lib/personalization/relevance";
import { scoreSavedChannel } from "@/lib/personalization/signal-blend";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import type { EditorialImportanceLabel, OnboardingProfile, Story } from "@/lib/types";
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

function savedTagAffinity(
  story: Story,
  intelligence?: UserIntelligenceProfile | null
): number {
  if (!intelligence) return 0;
  let boost = 0;
  for (const tw of intelligence.primaryTags ?? intelligence.topTags) {
    if (storyMatchesTag(story, tw.tag) && tw.score >= 6) {
      boost += 1.8;
    }
  }
  return boost;
}

export function computePersonalizedImportance(
  story: Story,
  signals: PersonalizationSignals,
  intelligence?: UserIntelligenceProfile | null
): number {
  const { profile, behavior } = signals;

  if (isNoiseStory(story)) {
    return Math.min(3, story.importanceScore ?? 3);
  }

  const global = story.importanceScore ?? 5;
  const strategic = getStrategicSignal(story);

  let personal = global * 0.35 + strategic * 3.5;

  personal += interestAlignment(story, profile);

  if (profile.career) {
    const careerTags = CAREER_TAG_BOOST[profile.career];
    const hits = careerTags.filter((t) => storyMatchesThematicTag(story, t)).length;
    personal += hits * 1.2;
  }

  if (behavior?.savedSlugs?.includes(story.slug)) personal += 4;
  personal += scoreSavedChannel(story, intelligence) * 3.5;
  personal += savedTagAffinity(story, intelligence);
  if (behavior?.skippedSlugs?.includes(story.slug)) personal -= 1.5;

  return Math.round(Math.min(10, Math.max(1, personal)));
}

export function personalizedImportanceLabel(
  score: number,
  story: Story
): EditorialImportanceLabel {
  if (isNoiseStory(story)) return "Low";
  if (score >= 9 && meetsCriticalBar(story)) return "Critical";
  if (score >= 7) return "High";
  if (score >= 4) return "Medium";
  return "Low";
}

export function isCriticalForUser(
  story: Story,
  signals: PersonalizationSignals,
  intelligence?: UserIntelligenceProfile | null
): boolean {
  if (isNoiseStory(story)) return false;
  return (
    computePersonalizedImportance(story, signals, intelligence) >= 9 &&
    meetsCriticalBar(story)
  );
}
