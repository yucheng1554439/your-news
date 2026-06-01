import { extractEntities } from "@/lib/editorial/narrative-clusters";
import type { Story } from "@/lib/types";

export type IntelligenceMatchResult = {
  match: boolean;
  storySlug: string;
  storyHeadline: string;
  intelligenceAnchorSlug?: string;
  intelligenceAnchorHeadline?: string;
  intelligenceMaterialSlugs?: string[];
  headlineTokenOverlap: number;
  reasons: string[];
};

function headlineTokens(headline: string): string[] {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

export function verifyIntelligenceMatch(
  story: Story,
  enriched: Pick<
    Story,
    | "slug"
    | "headline"
    | "summary"
    | "whyItMatters"
    | "intelligenceAnchorSlug"
    | "intelligenceAnchorHeadline"
    | "intelligenceMaterialSlugs"
  >
): IntelligenceMatchResult {
  const reasons: string[] = [];
  const intelText = `${enriched.summary ?? ""} ${enriched.whyItMatters ?? ""}`.toLowerCase();

  if (
    enriched.intelligenceAnchorSlug &&
    enriched.intelligenceAnchorSlug !== story.slug
  ) {
    reasons.push(
      `anchor slug mismatch: intelligence=${enriched.intelligenceAnchorSlug} story=${story.slug}`
    );
  }

  if (
    enriched.intelligenceAnchorHeadline &&
    enriched.intelligenceAnchorHeadline !== story.headline
  ) {
    const anchorKey = enriched.intelligenceAnchorHeadline.slice(0, 48);
    const storyKey = story.headline.slice(0, 48);
    if (anchorKey !== storyKey) {
      reasons.push(
        `anchor headline mismatch: "${enriched.intelligenceAnchorHeadline.slice(0, 60)}" vs "${story.headline.slice(0, 60)}"`
      );
    }
  }

  const tokens = headlineTokens(story.headline);
  const hits = tokens.filter((t) => intelText.includes(t)).length;
  const headlineTokenOverlap =
    tokens.length > 0 ? hits / tokens.length : 1;

  const storyEntities = extractEntities(story);
  const entityInIntel = storyEntities.some((e) => intelText.includes(e));

  if (
    tokens.length >= 3 &&
    headlineTokenOverlap < 0.12 &&
    !entityInIntel &&
    enriched.whyItMatters?.trim()
  ) {
    reasons.push(
      `topic mismatch: headline-intelligence token overlap ${(headlineTokenOverlap * 100).toFixed(0)}%`
    );
  }

  return {
    match: reasons.length === 0,
    storySlug: story.slug,
    storyHeadline: story.headline,
    intelligenceAnchorSlug: enriched.intelligenceAnchorSlug,
    intelligenceAnchorHeadline: enriched.intelligenceAnchorHeadline,
    intelligenceMaterialSlugs: enriched.intelligenceMaterialSlugs,
    headlineTokenOverlap,
    reasons,
  };
}
