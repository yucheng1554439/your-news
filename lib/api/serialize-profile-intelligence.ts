import "server-only";

import { topicPreferenceLabel } from "@/lib/personalization/topic-options";
import type { ReadingSignalsMetadata } from "@/lib/personalization/reading-signals-metadata";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import type { SavedStoryRef } from "@/lib/saved-stories/metadata";
import type { OnboardingProfile, TopicPreferences } from "@/lib/types";

const CAREER_LABELS: Record<string, string> = {
  engineer: "Software Engineer",
  investor: "Investor",
  founder: "Founder",
  executive: "Executive",
  researcher: "Researcher",
};

const FOCUS_LABELS: Record<string, string> = {
  breaking: "Breaking News",
  depth: "Deep Analysis",
  breadth: "Broad Coverage",
};

const TONE_LABELS: Record<string, string> = {
  analytical: "Analytical",
  concise: "Concise",
  narrative: "Narrative",
};

export type ProfileIntelligenceApiPayload = {
  ok: true;
  effectiveLens: string;
  identity: {
    career: string | null;
    interests: string[];
    focus: string | null;
    tone: string | null;
  };
  primaryThemes: string[];
  emergingThemes: string[];
  behavior: {
    storiesOpened: number;
    storiesSaved: number;
    deepReads: number;
    behaviorConfidenceLabel: string;
    summary: string;
  };
  preferences: {
    moreOf: string[];
    lessOf: string[];
    neverShow: string[];
  };
  savedInfluence: {
    themes: string[];
    summary: string;
  };
};

function countDeepReads(reading: ReadingSignalsMetadata): number {
  return reading.opens.filter((o) => (o.dwellMs ?? 0) >= 30_000).length;
}

function behaviorSummary(
  uip: UserIntelligenceProfile,
  savedCount: number,
  deepReads: number
): string {
  const conf = uip.behaviorConfidence;
  if (savedCount >= 3 && deepReads >= 2) {
    return "Your profile is strongly influenced by saved stories and deep reads.";
  }
  if (savedCount >= 2) {
    return "Saved stories are the strongest signal shaping what we surface for you.";
  }
  if (deepReads >= 2) {
    return "Recent deep reads are adjusting which themes rise in your feed.";
  }
  if (conf >= 0.35) {
    return "Your reading behavior is starting to refine rankings alongside your stated interests.";
  }
  return "Your feed is primarily driven by career, interests, and topic preferences.";
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.55) return "Strong";
  if (confidence >= 0.35) return "Growing";
  if (confidence >= 0.15) return "Early";
  return "Onboarding";
}

export function serializeProfileIntelligence(
  profile: OnboardingProfile | null,
  uip: UserIntelligenceProfile | null,
  savedRefs: SavedStoryRef[],
  reading: ReadingSignalsMetadata,
  topicPreferences: TopicPreferences
): ProfileIntelligenceApiPayload | null {
  if (!profile?.completed || !uip) return null;

  const primaryThemes = (uip.primaryThemes ?? uip.topThemes).map((t) => t.label);
  const emerging = [
    ...uip.emergingInterests,
    ...(uip.secondaryThemes ?? [])
      .filter((t) => !primaryThemes.includes(t.label))
      .map((t) => t.label),
  ];
  const emergingThemes = [...new Set(emerging)].slice(0, 8);

  const savedThemeLabels = (uip.primaryThemes ?? uip.topThemes)
    .filter((t) => t.sources.includes("saved"))
    .map((t) => t.label);

  const savedInfluenceThemes =
    savedThemeLabels.length > 0
      ? savedThemeLabels.slice(0, 6)
      : primaryThemes.slice(0, 4);

  const deepReads = countDeepReads(reading);

  return {
    ok: true,
    effectiveLens: uip.effectiveLens,
    identity: {
      career: profile.career ? CAREER_LABELS[profile.career] ?? profile.career : null,
      interests: profile.interests.map((id) => topicPreferenceLabel(id)),
      focus: profile.focusType
        ? FOCUS_LABELS[profile.focusType] ?? profile.focusType
        : null,
      tone: profile.tone ? TONE_LABELS[profile.tone] ?? profile.tone : null,
    },
    primaryThemes,
    emergingThemes,
    behavior: {
      storiesOpened: reading.opens.length,
      storiesSaved: savedRefs.length,
      deepReads,
      behaviorConfidenceLabel: confidenceLabel(uip.behaviorConfidence),
      summary: behaviorSummary(uip, savedRefs.length, deepReads),
    },
    preferences: {
      moreOf: topicPreferences.moreOf.map(topicPreferenceLabel),
      lessOf: topicPreferences.lessOf.map(topicPreferenceLabel),
      neverShow: topicPreferences.neverShow.map(topicPreferenceLabel),
    },
    savedInfluence: {
      themes: savedInfluenceThemes,
      summary:
        savedInfluenceThemes.length > 0
          ? "Saved stories are currently increasing coverage of these themes."
          : "Save stories to train which themes rise in your feed.",
    },
  };
}
