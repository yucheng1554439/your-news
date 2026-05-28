import { isLowSignalStory } from "@/lib/signal/strategic-score";
import type { Story, StoryCategory } from "@/lib/types";

/** Editorial domains for feed breadth (not the UI filter tabs). */
export type FeedDomain =
  | "markets"
  | "geopolitics"
  | "policy"
  | "energy"
  | "ai-tech"
  | "science-health"
  | "defense"
  | "cyber"
  | "infrastructure"
  | "general";

const DOMAIN_ORDER: FeedDomain[] = [
  "geopolitics",
  "markets",
  "policy",
  "energy",
  "ai-tech",
  "science-health",
  "defense",
  "cyber",
  "infrastructure",
  "general",
];

const DEFENSE_PATTERN =
  /\b(pentagon|defense department|military|missile|navy|army|air force|weapons|nato exercise|defense spending)\b/i;

const HEALTH_PATTERN =
  /\b(healthcare|hospital|fda|drug approval|pharma|medicare|medicaid|public health|clinical)\b/i;

export function getFeedDomain(story: Story): FeedDomain {
  const blob = `${story.headline} ${story.summary}`;
  if (story.category === "markets" || story.tags.includes("investing")) {
    return "markets";
  }
  if (
    story.category === "geopolitics" ||
    story.tags.includes("geopolitics") ||
    story.tags.includes("supply-chain")
  ) {
    return "geopolitics";
  }
  if (story.category === "policy" || story.tags.includes("policy")) {
    return "policy";
  }
  if (story.category === "energy" || story.tags.includes("energy")) {
    return "energy";
  }
  if (story.category === "cybersecurity" || story.tags.includes("cybersecurity")) {
    return "cyber";
  }
  if (DEFENSE_PATTERN.test(blob)) return "defense";
  if (HEALTH_PATTERN.test(blob) || story.tags.includes("science")) {
    return "science-health";
  }
  if (
    story.category === "ai" ||
    story.category === "technology" ||
    story.category === "developer" ||
    story.tags.some((t) =>
      ["ai", "ai-infrastructure", "semiconductors", "enterprise-ai"].includes(t)
    )
  ) {
    return "ai-tech";
  }
  if (story.tags.includes("infrastructure")) return "infrastructure";
  return "general";
}

export type MixFeedOptions = {
  limit?: number;
  picksPerDomain?: number;
};

/**
 * Interleave high-signal stories across domains so the feed is not AI-only.
 */
export function mixFeedByDomain(
  ranked: Story[],
  options: MixFeedOptions = {}
): Story[] {
  const limit = options.limit ?? ranked.length;
  const picksPerDomain = options.picksPerDomain ?? 2;
  const eligible = ranked.filter((s) => !isLowSignalStory(s));

  const buckets = new Map<FeedDomain, Story[]>();
  for (const domain of DOMAIN_ORDER) buckets.set(domain, []);

  for (const story of eligible) {
    const domain = getFeedDomain(story);
    buckets.get(domain)!.push(story);
  }

  const used = new Set<string>();
  const mixed: Story[] = [];

  let round = 0;
  while (mixed.length < limit && round < picksPerDomain * 3) {
    for (const domain of DOMAIN_ORDER) {
      const pool = buckets.get(domain);
      while (pool && pool.length > 0 && mixed.length < limit) {
        const next = pool.shift()!;
        if (used.has(next.slug)) continue;
        used.add(next.slug);
        mixed.push(next);
        break;
      }
    }
    round += 1;
  }

  for (const story of eligible) {
    if (mixed.length >= limit) break;
    if (used.has(story.slug)) continue;
    used.add(story.slug);
    mixed.push(story);
  }

  return mixed;
}

