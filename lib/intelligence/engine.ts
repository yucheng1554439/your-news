import "server-only";

import {
  articleBodyFingerprint,
  ensureStoryArticleBody,
} from "@/lib/extraction/resolve-body";
import { applyIntelligenceToStory } from "@/lib/intelligence/apply";
import {
  contentFingerprint,
  readIntelligenceCache,
  writeIntelligenceCache,
} from "@/lib/intelligence/cache";
import { buildFallbackIntelligence } from "@/lib/intelligence/fallback";
import {
  getAIProvider,
  isAIConfigured,
  isAIFallbackAllowed,
} from "@/lib/intelligence/provider";
import {
  hashProfile,
  canGeneratePersonalizedSection,
} from "@/lib/intelligence/profile-context";
import { generateUnifiedIntelligence } from "@/lib/intelligence/unified-intelligence";
import type { StoryIntelligencePackage } from "@/lib/intelligence/types";
import type { OnboardingProfile, Story } from "@/lib/types";

export type { StoryIntelligencePackage } from "@/lib/intelligence/types";

function logFallback(slug: string, reason: string): void {
  const provider = getAIProvider();
  console.warn(
    `[${provider.toUpperCase()}] Story intelligence fallback for ${slug} — reason: ${reason}`
  );
}

export async function resolveStoryIntelligence(
  story: Story,
  profile: OnboardingProfile | null = null
): Promise<StoryIntelligencePackage> {
  const profileHash = hashProfile(
    profile && canGeneratePersonalizedSection(profile) ? profile : null
  );
  const storyWithBody = await ensureStoryArticleBody(story);

  const fingerprint = contentFingerprint(
    storyWithBody.headline,
    storyWithBody.publishedAt,
    storyWithBody.articleBody ?? storyWithBody.rawExcerpt,
    articleBodyFingerprint(storyWithBody)
  );

  const cached = await readIntelligenceCache(
    storyWithBody.slug,
    profileHash,
    fingerprint
  );
  if (cached) return cached;

  if (!isAIConfigured()) {
    const provider = getAIProvider();
    const keyName =
      provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
    logFallback(storyWithBody.slug, `${keyName} not configured`);
    const pkg = buildFallbackIntelligence(storyWithBody, profile, profileHash);
    await writeIntelligenceCache(
      storyWithBody.slug,
      profileHash,
      fingerprint,
      pkg
    );
    return pkg;
  }

  const ai = await generateUnifiedIntelligence(
    storyWithBody,
    profile,
    profileHash
  );

  if (ai.ok) {
    await writeIntelligenceCache(
      storyWithBody.slug,
      profileHash,
      fingerprint,
      ai.package
    );
    return ai.package;
  }

  logFallback(storyWithBody.slug, ai.error);

  if (!isAIFallbackAllowed()) {
    throw new Error(
      `${getAIProvider()} story intelligence failed: ${ai.error}`
    );
  }

  return {
    ...buildFallbackIntelligence(storyWithBody, profile, profileHash),
    aiError: ai.error,
    openaiError: ai.error,
  };
}

export async function enrichStoryWithIntelligence(
  story: Story,
  profile: OnboardingProfile | null = null
): Promise<Story> {
  const pkg = await resolveStoryIntelligence(story, profile);
  return applyIntelligenceToStory(story, pkg);
}
