import "server-only";

import { callAIJson } from "@/lib/intelligence/provider";
import { buildUnifiedIntelligencePrompt } from "@/lib/intelligence/prompts";
import { parseStoryIntelligenceResponse } from "@/lib/intelligence/parse-tagged-story";
import { signalsFromProfile } from "@/lib/personalization/signals";
import { canPersonalize } from "@/lib/personalization/context";
import type { StoryIntelligencePackage } from "@/lib/intelligence/types";
import type { ClusterIntelligence, OnboardingProfile, Story } from "@/lib/types";

export async function generateUnifiedIntelligence(
  story: Story,
  profile: OnboardingProfile | null,
  profileFingerprint: string,
  cluster?: ClusterIntelligence | null,
  materialStories?: Story[]
): Promise<
  | { ok: true; package: StoryIntelligencePackage }
  | { ok: false; error: string }
> {
  const signals = profile ? signalsFromProfile(profile) : null;
  const personalized = signals && canPersonalize(signals);

  const result = await callAIJson({
    label: `Story intelligence · ${story.slug.slice(0, 48)}`,
    system:
      "You are a personal intelligence advisor when a reader profile is present: explain what happened, why it matters to THEM, what decisions it may influence, and what to monitor. Facts first; no news narration.",
    user: buildUnifiedIntelligencePrompt(
      story,
      profile,
      cluster,
      materialStories
    ),
    temperature: personalized ? 0.32 : 0.28,
    maxTokens: 720,
    responseFormat: "tags",
    parse: (content) =>
      parseStoryIntelligenceResponse(content, profileFingerprint),
  });

  if (result.ok) {
    return { ok: true, package: result.data };
  }
  return { ok: false, error: result.error };
}

/** @deprecated Use generateUnifiedIntelligence */
export const generateUnifiedIntelligenceOpenAI = generateUnifiedIntelligence;
