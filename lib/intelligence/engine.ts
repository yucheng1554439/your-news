import "server-only";

import {
  articleBodyFingerprint,
  ensureStoryArticleBody,
} from "@/lib/extraction/resolve-body";
import {
  isArticleBodyAvailable,
  needsMetadataIntelligence,
} from "@/lib/extraction/article-body";
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
import { clusterIntelligenceFingerprint } from "@/lib/intelligence/cluster-context";
import { resolveMetadataSignalIntelligence } from "@/lib/intelligence/signal-summary";
import { resolveStoryIntelligenceMaterial } from "@/lib/intelligence/story-material";
import {
  logIntelligenceMismatch,
  logIntelligenceProvenance,
  verifyIntelligenceMatch,
} from "@/lib/intelligence/provenance";
import type { OnboardingProfile, Story } from "@/lib/types";

export type { StoryIntelligencePackage } from "@/lib/intelligence/types";

export type StoryIntelligenceOptions = {
  /** Story pool for same-event corroboration lookup only — not weekly synthesis input. */
  pool?: Story[];
};

function logFallback(slug: string, reason: string): void {
  const provider = getAIProvider();
  console.warn(
    `[${provider.toUpperCase()}] Story intelligence fallback for ${slug} — reason: ${reason}`
  );
}

function attachProvenance(
  pkg: StoryIntelligencePackage,
  anchor: Story,
  materialSlugs: string[],
  clusterId?: string,
  usedCluster = false
): StoryIntelligencePackage {
  return {
    ...pkg,
    anchorSlug: anchor.slug,
    anchorHeadline: anchor.headline,
    materialSlugs,
    clusterId,
    usedClusterMaterial: usedCluster,
  };
}

function profileHashFor(profile: OnboardingProfile | null): string {
  return hashProfile(
    profile && canGeneratePersonalizedSection(profile) ? profile : null
  );
}

function packageToStory(story: Story, pkg: StoryIntelligencePackage): Story {
  return applyIntelligenceToStory(story, pkg);
}

/** Metadata-based signal summary — only when article body is unavailable. */
export async function enrichStoryWithMetadataSignal(
  story: Story,
  profile: OnboardingProfile | null,
  pool: Story[] = []
): Promise<Story> {
  const anchorStory = await ensureStoryArticleBody(story);
  const profileHash = profileHashFor(profile);
  const raw = resolveMetadataSignalIntelligence(
    anchorStory,
    pool,
    profile,
    profileHash,
    { paywall: needsMetadataIntelligence(anchorStory) }
  );
  const pkg = attachProvenance(
    raw,
    anchorStory,
    raw.materialSlugs ?? [anchorStory.slug],
    undefined,
    (raw.materialSlugs?.length ?? 1) > 1
  );
  return packageToStory(anchorStory, pkg);
}

async function resolveAnchorOnlyIntelligence(
  anchorStory: Story,
  profile: OnboardingProfile | null,
  profileHash: string
): Promise<StoryIntelligencePackage | null> {
  if (!isArticleBodyAvailable(anchorStory) || !isAIConfigured()) {
    return null;
  }

  const fingerprint = `anchor-only|${contentFingerprint(
    anchorStory.headline,
    anchorStory.publishedAt,
    anchorStory.articleBody ?? anchorStory.rawExcerpt,
    articleBodyFingerprint(anchorStory)
  )}`;

  const cached = await readIntelligenceCache(
    anchorStory.slug,
    profileHash,
    fingerprint
  );
  if (cached) {
    return attachProvenance(cached, anchorStory, [anchorStory.slug], undefined, false);
  }

  const ai = await generateUnifiedIntelligence(
    anchorStory,
    profile,
    profileHash,
    null,
    [anchorStory]
  );

  if (!ai.ok) return null;

  const pkg = attachProvenance(
    ai.package,
    anchorStory,
    [anchorStory.slug],
    undefined,
    false
  );
  await writeIntelligenceCache(
    anchorStory.slug,
    profileHash,
    fingerprint,
    pkg
  );
  return pkg;
}

export async function resolveStoryIntelligence(
  story: Story,
  profile: OnboardingProfile | null = null,
  options?: StoryIntelligenceOptions
): Promise<StoryIntelligencePackage> {
  const profileHash = profileHashFor(profile);
  const pool = options?.pool ?? [];

  const material = await resolveStoryIntelligenceMaterial(story, pool);
  const anchorStory = material.anchor;
  const materialStories = material.materialStories;
  const cluster = material.cluster;
  const useCluster = materialStories.length > 1;

  if (needsMetadataIntelligence(anchorStory)) {
    const pkg = attachProvenance(
      resolveMetadataSignalIntelligence(
        anchorStory,
        pool,
        profile,
        profileHash,
        { paywall: true }
      ),
      anchorStory,
      materialStories.map((s) => s.slug),
      cluster?.id,
      useCluster
    );

    const fingerprint = `metadata|${anchorStory.slug}|${material.corroboratingSlugs.sort().join(",")}|${anchorStory.headline.slice(0, 80)}`;
    const cached = await readIntelligenceCache(
      anchorStory.slug,
      profileHash,
      fingerprint
    );
    if (cached) {
      return attachProvenance(
        cached,
        anchorStory,
        cached.materialSlugs ?? materialStories.map((s) => s.slug),
        cached.clusterId ?? cluster?.id,
        useCluster
      );
    }

    await writeIntelligenceCache(
      anchorStory.slug,
      profileHash,
      fingerprint,
      pkg
    );
    return pkg;
  }

  const materialSlugs = materialStories.map((s) => s.slug);

  const fingerprint =
    useCluster && cluster
      ? `${clusterIntelligenceFingerprint(cluster, materialStories)}|anchor:${anchorStory.slug}`
      : contentFingerprint(
          anchorStory.headline,
          anchorStory.publishedAt,
          anchorStory.articleBody ?? anchorStory.rawExcerpt,
          articleBodyFingerprint(anchorStory)
        );

  const cached = await readIntelligenceCache(
    anchorStory.slug,
    profileHash,
    fingerprint
  );
  if (cached) {
    return attachProvenance(
      cached,
      anchorStory,
      cached.materialSlugs ?? materialSlugs,
      cached.clusterId ?? cluster?.id,
      cached.usedClusterMaterial ?? useCluster
    );
  }

  if (!isAIConfigured()) {
    const provider = getAIProvider();
    const keyName =
      provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
    logFallback(anchorStory.slug, `${keyName} not configured`);
    const pkg = attachProvenance(
      buildFallbackIntelligence(anchorStory, profile, profileHash),
      anchorStory,
      materialSlugs,
      cluster?.id,
      useCluster
    );
    await writeIntelligenceCache(
      anchorStory.slug,
      profileHash,
      fingerprint,
      pkg
    );
    return pkg;
  }

  const ai = await generateUnifiedIntelligence(
    anchorStory,
    profile,
    profileHash,
    cluster,
    materialStories
  );

  if (ai.ok) {
    const pkg = attachProvenance(
      ai.package,
      anchorStory,
      materialSlugs,
      cluster?.id,
      useCluster
    );
    await writeIntelligenceCache(
      anchorStory.slug,
      profileHash,
      fingerprint,
      pkg
    );
    return pkg;
  }

  logFallback(anchorStory.slug, ai.error);

  if (!isAIFallbackAllowed()) {
    throw new Error(
      `${getAIProvider()} story intelligence failed: ${ai.error}`
    );
  }

  return attachProvenance(
    {
      ...buildFallbackIntelligence(anchorStory, profile, profileHash),
      aiError: ai.error,
      openaiError: ai.error,
    },
    anchorStory,
    materialSlugs,
    cluster?.id,
    useCluster
  );
}

export async function enrichStoryWithIntelligence(
  story: Story,
  profile: OnboardingProfile | null = null,
  options?: StoryIntelligenceOptions
): Promise<Story> {
  const pool = options?.pool ?? [];
  const anchorStory = await ensureStoryArticleBody(story);
  const profileHash = profileHashFor(profile);

  let pkg = await resolveStoryIntelligence(anchorStory, profile, { pool });
  let enriched = packageToStory(anchorStory, pkg);

  let match = verifyIntelligenceMatch(story, enriched);
  if (!match.match && isArticleBodyAvailable(anchorStory)) {
    logIntelligenceMismatch("enrichStoryWithIntelligence — retry anchor-only", match);
    const anchorPkg = await resolveAnchorOnlyIntelligence(
      anchorStory,
      profile,
      profileHash
    );
    if (anchorPkg) {
      enriched = packageToStory(anchorStory, anchorPkg);
      match = verifyIntelligenceMatch(story, enriched);
    }
  }

  if (!match.match && needsMetadataIntelligence(anchorStory)) {
    logIntelligenceMismatch("enrichStoryWithIntelligence — metadata fallback", match);
    enriched = await enrichStoryWithMetadataSignal(anchorStory, profile, pool);
    match = verifyIntelligenceMatch(story, enriched);
  }

  logIntelligenceProvenance(
    story,
    {
      anchorSlug: enriched.intelligenceAnchorSlug ?? story.slug,
      anchorHeadline: enriched.intelligenceAnchorHeadline ?? story.headline,
      materialSlugs: enriched.intelligenceMaterialSlugs ?? [story.slug],
      clusterId: enriched.intelligenceClusterId,
      clusterTitle: undefined,
      usedClusterMaterial: (enriched.intelligenceMaterialSlugs?.length ?? 1) > 1,
    },
    match
  );

  return enriched;
}
