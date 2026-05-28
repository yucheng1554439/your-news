import type { Story } from "@/lib/types";

export type SourceTier = 1 | 2 | 3;

/** Tier 1 — wire services and papers of record. */
const TIER_1 = [
  "reuters",
  "bloomberg",
  "wall street journal",
  "wsj",
  "financial times",
  "associated press",
  "ap news",
  "new york times",
  "nyt",
  "washington post",
  "bbc news",
  "bbc",
  "npr",
  "the economist",
];

/** Tier 2 — credible trade and business press. */
const TIER_2 = [
  "cnbc",
  "axios",
  "the verge",
  "techcrunch",
  "wired",
  "ars technica",
  "fortune",
  "business insider",
  "politico",
  "cnn",
  "nbc",
  "abc news",
  "fox news",
  "los angeles times",
  "usa today",
  "barron",
];

/** Tier 3 — promotional, platform, or company-owned. */
const TIER_3 = [
  "xbox wire",
  "playstation.blog",
  "blog.playstation",
  "company blog",
  "press release",
  "pr newswire",
  "business wire",
  "globe newswire",
  "medium.com",
  "substack",
  "brand channel",
  "corporate blog",
  "investor relations",
];

const PROMO_IN_BODY =
  /\b(press release|announces availability|now available|pre-order|launch event|exclusive preview|sponsored|advertisement)\b/i;

export function normalizeSourceName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s.]/g, " ").trim();
}

export function getSourceTier(sourceName: string): SourceTier {
  const n = normalizeSourceName(sourceName);
  if (TIER_1.some((t) => n.includes(t) || t.includes(n))) return 1;
  if (TIER_3.some((t) => n.includes(t))) return 3;
  if (TIER_2.some((t) => n.includes(t) || t.includes(n))) return 2;
  return 2;
}

/** Editorial weight 0–1 for ranking. */
export function getSourceAuthorityWeight(tier: SourceTier): number {
  switch (tier) {
    case 1:
      return 1;
    case 2:
      return 0.62;
    case 3:
      return 0.22;
  }
}

export function getStorySourceTier(story: Story): SourceTier {
  return story.sourceTier ?? getSourceTier(story.source);
}

export function isPromotionalSource(story: Story): boolean {
  if (getStorySourceTier(story) === 3) return true;
  const blob = `${story.headline} ${story.summary} ${story.source}`;
  return PROMO_IN_BODY.test(blob);
}

/** Tier-3 stories need multi-outlet confirmation to rank highly. */
export function requiresCorroboration(story: Story): boolean {
  return getStorySourceTier(story) >= 3 || isPromotionalSource(story);
}

export function trustedSourceBoost(sourceName: string): number {
  const tier = getSourceTier(sourceName);
  return tier === 1 ? 4 : tier === 2 ? 2 : 0;
}

export function isTrustedSource(sourceName: string): boolean {
  return getSourceTier(sourceName) <= 2;
}
