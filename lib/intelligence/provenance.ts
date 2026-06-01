import "server-only";

import {
  detectNarrativeTheme,
  extractEntities,
} from "@/lib/editorial/narrative-clusters";
import {
  verifyIntelligenceMatch,
  type IntelligenceMatchResult,
} from "@/lib/intelligence/provenance-match";
import type { ClusterIntelligence, Story } from "@/lib/types";

export type { IntelligenceMatchResult } from "@/lib/intelligence/provenance-match";
export { verifyIntelligenceMatch } from "@/lib/intelligence/provenance-match";

export type IntelligenceProvenance = {
  anchorSlug: string;
  anchorHeadline: string;
  materialSlugs: string[];
  fingerprint?: string;
  clusterId?: string;
  clusterTitle?: string;
  usedClusterMaterial: boolean;
};

/** Whether cluster corroboration is appropriate for this story's intelligence. */
export function shouldUseClusterMaterial(
  story: Story,
  cluster: ClusterIntelligence | null
): boolean {
  if (!cluster || cluster.articleCount <= 1) return false;
  if (story.slug === cluster.representativeSlug) return true;

  const storyTheme = story.narrativeTheme ?? detectNarrativeTheme(story);
  if (storyTheme !== "general" && storyTheme === cluster.theme) {
    const storyEntities = new Set(extractEntities(story));
    const overlap = cluster.entities.filter((e) => storyEntities.has(e)).length;
    if (overlap >= 1) return true;
  }

  const storyEntities = new Set(extractEntities(story));
  const clusterEntities = new Set(cluster.entities);
  const entityOverlap = [...storyEntities].filter((e) =>
    clusterEntities.has(e)
  ).length;
  return entityOverlap >= 2;
}

export function logIntelligenceMismatch(
  context: string,
  result: IntelligenceMatchResult
): void {
  console.error(
    `[INTELLIGENCE_MISMATCH] ${context}`,
    JSON.stringify(
      {
        storyId: result.storySlug,
        storySlug: result.storySlug,
        storyHeadline: result.storyHeadline,
        intelligenceAnchorSlug: result.intelligenceAnchorSlug,
        intelligenceAnchorHeadline: result.intelligenceAnchorHeadline,
        intelligenceMaterialSlugs: result.intelligenceMaterialSlugs,
        headlineTokenOverlap: result.headlineTokenOverlap,
        reasons: result.reasons,
      },
      null,
      0
    )
  );
}

export function logIntelligenceProvenance(
  story: Story,
  provenance: IntelligenceProvenance,
  match: IntelligenceMatchResult
): void {
  console.log(
    "[INTELLIGENCE_PROVENANCE]",
    JSON.stringify(
      {
        storyId: story.slug,
        storySlug: story.slug,
        storyHeadline: story.headline,
        intelligenceAnchorSlug: provenance.anchorSlug,
        intelligenceAnchorHeadline: provenance.anchorHeadline,
        intelligenceMaterialSlugs: provenance.materialSlugs,
        intelligenceClusterId: provenance.clusterId,
        usedClusterMaterial: provenance.usedClusterMaterial,
        match: match.match,
        headlineTokenOverlap: match.headlineTokenOverlap,
      },
      null,
      0
    )
  );
}

const INTELLIGENCE_FIELDS = [
  "summary",
  "whyItMatters",
  "whyItMattersToYou",
  "nextWatch",
  "economicImplications",
  "perspectives",
  "marketReaction",
  "sourceContext",
  "intelligenceGeneratedBy",
  "intelligenceAiError",
  "intelligenceOpenaiError",
  "intelligenceAnchorSlug",
  "intelligenceAnchorHeadline",
  "intelligenceMaterialSlugs",
  "intelligenceFingerprint",
  "intelligenceClusterId",
  "paywallDetected",
  "signalSummaryDisclaimer",
  "corroboratingSlugs",
] as const;

/** Merge intelligence onto base story; strip on provenance mismatch. */
export function mergeStoryIntelligenceSafely(
  base: Story,
  enriched: Story,
  context: string
): Story {
  const match = verifyIntelligenceMatch(base, enriched);
  if (!match.match) {
    logIntelligenceMismatch(context, match);
    return base;
  }

  return {
    ...base,
    summary: enriched.summary,
    whyItMatters: enriched.whyItMatters,
    whyItMattersToYou: enriched.whyItMattersToYou,
    nextWatch: enriched.nextWatch,
    economicImplications: enriched.economicImplications,
    perspectives: enriched.perspectives,
    marketReaction: enriched.marketReaction,
    sourceContext: enriched.sourceContext,
    intelligenceGeneratedBy: enriched.intelligenceGeneratedBy,
    intelligenceAiError: undefined,
    intelligenceOpenaiError: undefined,
    intelligenceAnchorSlug: enriched.intelligenceAnchorSlug ?? base.slug,
    intelligenceAnchorHeadline:
      enriched.intelligenceAnchorHeadline ?? base.headline,
    intelligenceMaterialSlugs:
      enriched.intelligenceMaterialSlugs ?? [base.slug],
    intelligenceFingerprint: enriched.intelligenceFingerprint,
    intelligenceClusterId: enriched.intelligenceClusterId,
    paywallDetected: enriched.paywallDetected,
    signalSummaryDisclaimer: enriched.signalSummaryDisclaimer,
    corroboratingSlugs: enriched.corroboratingSlugs,
  };
}

export function stripIntelligenceFields(story: Story): Story {
  const copy = { ...story };
  for (const key of INTELLIGENCE_FIELDS) {
    delete copy[key as keyof Story];
  }
  return copy;
}
