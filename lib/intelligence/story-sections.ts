import { sectionsTooSimilar } from "@/lib/briefing/shared/section-similarity";
import {
  buildMetadataBriefing,
  buildMetadataPersonalizedWhy,
  buildMetadataWhatToWatch,
  buildMetadataWhyItMatters,
  isPlaceholderWatch,
  isWrongNoDirectImpact,
  repairStoryIntelligencePackage,
  stripArticleArtifacts,
} from "@/lib/intelligence/story-intelligence-quality";
import { canGeneratePersonalizedSection } from "@/lib/intelligence/profile-context";
import type { StoryIntelligencePackage } from "@/lib/intelligence/types";
import type { OnboardingProfile, Story } from "@/lib/types";

export const STORY_INTEL_SECTION_TITLES = {
  briefing: "The Briefing",
  whyItMatters: "Why It Matters",
  whyItMattersToYou: "Why This Matters To You",
  whatToWatch: "What To Watch",
} as const;

export const STORY_INTEL_FALLBACKS = {
  briefing:
    "Coverage is developing — additional reporting may refine the strategic picture.",
  whyItMatters:
    "Monitor whether this story develops beyond the current reporting window.",
  whyItMattersToYou:
    "No direct impact detected for your current intelligence profile.",
  whatToWatch:
    "Watch for follow-up reporting, official responses, or broader adoption of this trend.",
} as const;

export type StoryIntelSection = {
  title: string;
  body: string;
  isFallback?: boolean;
  disclaimer?: string;
  highlight?: boolean;
};

export type ResolvedStoryIntelligence = {
  briefing: StoryIntelSection;
  whyItMatters: StoryIntelSection;
  whyItMattersToYou: StoryIntelSection;
  whatToWatch: StoryIntelSection;
};

function pickText(...candidates: (string | undefined | null)[]): string | null {
  for (const c of candidates) {
    const t = c?.trim();
    if (t) return t;
  }
  return null;
}

function packageFromStory(
  story: Story,
  whyItMattersToYouOverride?: string | null
): StoryIntelligencePackage {
  return {
    theBriefing: story.summary ?? "",
    whyItMatters: story.whyItMatters ?? "",
    whyItMattersToYou:
      pickText(whyItMattersToYouOverride, story.whyItMattersToYou) ?? undefined,
    nextWatch: story.nextWatch,
    generatedAt: new Date().toISOString(),
    profileFingerprint: "display",
    generatedBy: story.intelligenceGeneratedBy ?? "fallback",
  };
}

/** Deterministic story intelligence sections — repaired before display. */
export function resolveStoryIntelSections(
  story: Story,
  whyItMattersToYouOverride?: string | null,
  profile: OnboardingProfile | null = null
): ResolvedStoryIntelligence {
  const isMetadataSignal =
    story.intelligenceGeneratedBy === "metadata" || story.paywallDetected;

  const repaired = repairStoryIntelligencePackage(
    story,
    packageFromStory(story, whyItMattersToYouOverride),
    profile
  );

  const briefingBody = repaired.theBriefing || buildMetadataBriefing(story);
  const whyItMattersBody =
    repaired.whyItMatters || buildMetadataWhyItMatters(story);
  let whyYouBody =
    repaired.whyItMattersToYou ??
    (profile && canGeneratePersonalizedSection(profile)
      ? buildMetadataPersonalizedWhy(story, profile)
      : STORY_INTEL_FALLBACKS.whyItMattersToYou);

  if (
    profile &&
    isWrongNoDirectImpact(whyYouBody, story, profile)
  ) {
    whyYouBody = buildMetadataPersonalizedWhy(story, profile);
  }

  const watchBody =
    repaired.nextWatch && !isPlaceholderWatch(repaired.nextWatch)
      ? repaired.nextWatch
      : buildMetadataWhatToWatch(story);

  const briefingIsFallback =
    !pickText(story.summary) ||
    sectionsTooSimilar(
      stripArticleArtifacts(story.summary ?? ""),
      briefingBody,
      0.85
    );
  const whyIsFallback =
    !pickText(story.whyItMatters) ||
    sectionsTooSimilar(briefingBody, whyItMattersBody, 0.7);

  return {
    briefing: {
      title: STORY_INTEL_SECTION_TITLES.briefing,
      body: briefingBody,
      isFallback: briefingIsFallback,
      disclaimer: isMetadataSignal
        ? story.signalSummaryDisclaimer ??
          "Analysis based on metadata and corroborating coverage."
        : undefined,
    },
    whyItMatters: {
      title: STORY_INTEL_SECTION_TITLES.whyItMatters,
      body: whyItMattersBody,
      isFallback: whyIsFallback,
    },
    whyItMattersToYou: {
      title: STORY_INTEL_SECTION_TITLES.whyItMattersToYou,
      body: whyYouBody,
      isFallback:
        !pickText(whyItMattersToYouOverride, story.whyItMattersToYou) ||
        isWrongNoDirectImpact(whyYouBody, story, profile),
      highlight: true,
    },
    whatToWatch: {
      title: STORY_INTEL_SECTION_TITLES.whatToWatch,
      body: watchBody,
      isFallback:
        !pickText(story.nextWatch) || isPlaceholderWatch(story.nextWatch ?? ""),
    },
  };
}
