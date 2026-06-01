import type { StoryCategory } from "@/lib/types";
import { inferThematicTags, type ThematicTag } from "@/lib/intelligence/thematic-tags";

export type MultiTagProfile = {
  primaryCategory: StoryCategory;
  secondaryTags: string[];
  strategicTags: string[];
  /** Union for legacy `tags` field */
  allTags: string[];
  entityIds: string[];
};

type CompanyRule = { label: string; id: string; pattern: RegExp };
type LocationRule = { label: string; pattern: RegExp };
type TopicRule = { label: string; pattern: RegExp };

const COMPANY_RULES: CompanyRule[] = [
  { id: "nvidia", label: "Nvidia", pattern: /\bnvidia\b/i },
  { id: "tsmc", label: "TSMC", pattern: /\btsmc\b|\btaiwan semiconductor\b/i },
  { id: "amd", label: "AMD", pattern: /\badvanced micro devices\b|\bamd\b/i },
  { id: "intel", label: "Intel", pattern: /\bintel\b/i },
  { id: "openai", label: "OpenAI", pattern: /\bopenai\b/i },
  { id: "anthropic", label: "Anthropic", pattern: /\banthropic\b/i },
  { id: "microsoft", label: "Microsoft", pattern: /\bmicrosoft\b/i },
  { id: "google", label: "Google", pattern: /\bgoogle\b|\balphabet\b/i },
  { id: "amazon", label: "Amazon", pattern: /\bamazon\b|\baws\b/i },
  { id: "meta", label: "Meta", pattern: /\bmeta platforms\b|\bfacebook\b/i },
  { id: "apple", label: "Apple", pattern: /\bapple\b/i },
  { id: "broadcom", label: "Broadcom", pattern: /\bbroadcom\b/i },
  { id: "asml", label: "ASML", pattern: /\basml\b/i },
  { id: "tesla", label: "Tesla", pattern: /\btesla\b/i },
];

const LOCATION_RULES: LocationRule[] = [
  { label: "Taiwan", pattern: /\btaiwan\b/i },
  { label: "China", pattern: /\bchina\b|\bbeijing\b|\bchinese\b/i },
  { label: "United States", pattern: /\b(united states|u\.s\.|washington)\b/i },
  { label: "Europe", pattern: /\b(european union|eu commission|brussels)\b/i },
  { label: "Ukraine", pattern: /\bukraine\b/i },
  { label: "Middle East", pattern: /\b(gaza|israel|iran|saudi)\b/i },
  { label: "India", pattern: /\bindia\b|\bnew delhi\b/i },
  { label: "Japan", pattern: /\bjapan\b|\btokyo\b/i },
  { label: "South Korea", pattern: /\bsouth korea\b|\bseoul\b/i },
];

const TOPIC_RULES: TopicRule[] = [
  { label: "Semiconductors", pattern: /\b(chip|semiconductor|foundry|hbm|gpu)\b/i },
  { label: "Supply Chain", pattern: /\b(supply chain|export control|logistics)\b/i },
  { label: "IPO", pattern: /\bipo\b|\binitial public offering\b/i },
  { label: "Earnings", pattern: /\bearnings\b|\bquarterly results\b/i },
  { label: "M&A", pattern: /\b(acquisition|merger|takeover)\b/i },
  { label: "Defense", pattern: /\b(pentagon|defense spending|military)\b/i },
  { label: "Datacenters", pattern: /\bdata\s*cent(er|re)\b/i },
  { label: "Cloud", pattern: /\b(aws|azure|google cloud|hyperscaler)\b/i },
  { label: "Rates", pattern: /\b(fed\b|interest rate|rate cut|rate hike)\b/i },
  { label: "Trade Policy", pattern: /\b(tariff|trade war|export ban)\b/i },
  { label: "AI Models", pattern: /\b(llm|frontier model|gpt|claude)\b/i },
  { label: "Cybersecurity", pattern: /\b(ransomware|breach|zero-day)\b/i },
];

const CATEGORY_FROM_STRATEGIC: Partial<Record<ThematicTag, StoryCategory>> = {
  ai: "ai",
  "ai-infrastructure": "ai",
  "consumer-ai": "ai",
  "enterprise-ai": "ai",
  "open-source-ai": "ai",
  semiconductors: "ai",
  "developer-tools": "developer",
  "cloud-infrastructure": "technology",
  markets: "markets",
  investing: "markets",
  energy: "energy",
  geopolitics: "geopolitics",
  cybersecurity: "cybersecurity",
  startups: "startups",
  policy: "policy",
  sports: "technology",
  gaming: "technology",
};

function storyText(headline: string, excerpt: string, body?: string): string {
  return `${headline} ${excerpt} ${body ?? ""}`.trim();
}

function inferSecondaryTags(blob: string): { tags: string[]; entityIds: string[] } {
  const tags = new Set<string>();
  const entityIds: string[] = [];

  for (const { label, id, pattern } of COMPANY_RULES) {
    pattern.lastIndex = 0;
    if (pattern.test(blob)) {
      tags.add(label);
      entityIds.push(id);
    }
  }
  for (const { label, pattern } of LOCATION_RULES) {
    pattern.lastIndex = 0;
    if (pattern.test(blob)) tags.add(label);
  }
  for (const { label, pattern } of TOPIC_RULES) {
    pattern.lastIndex = 0;
    if (pattern.test(blob)) tags.add(label);
  }

  return { tags: [...tags], entityIds };
}

function refinePrimaryCategory(
  fallback: StoryCategory,
  strategicTags: string[]
): StoryCategory {
  const scores = new Map<StoryCategory, number>();
  scores.set(fallback, 2);

  for (const tag of strategicTags) {
    const cat = CATEGORY_FROM_STRATEGIC[tag as ThematicTag];
    if (cat) scores.set(cat, (scores.get(cat) ?? 0) + 1);
  }

  if (strategicTags.includes("markets") || strategicTags.includes("investing")) {
    scores.set("markets", (scores.get("markets") ?? 0) + 2);
  }
  if (
    strategicTags.includes("semiconductors") ||
    strategicTags.includes("ai-infrastructure")
  ) {
    scores.set("ai", (scores.get("ai") ?? 0) + 2);
  }
  if (strategicTags.includes("geopolitics") || strategicTags.includes("supply-chain")) {
    scores.set("geopolitics", (scores.get("geopolitics") ?? 0) + 1.5);
  }

  let best = fallback;
  let bestScore = scores.get(fallback) ?? 0;
  for (const [cat, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }
  return best;
}

/**
 * Build primary + secondary + strategic tags from article text.
 */
export function buildMultiTagProfile(input: {
  headline: string;
  excerpt: string;
  body?: string;
  fallbackCategory: StoryCategory;
}): MultiTagProfile {
  const blob = storyText(input.headline, input.excerpt, input.body);

  const strategicTags = inferThematicTags(
    input.headline,
    input.excerpt,
    input.fallbackCategory
  );

  const { tags: secondaryTags, entityIds } = inferSecondaryTags(blob);

  const primaryCategory = refinePrimaryCategory(
    input.fallbackCategory,
    strategicTags
  );

  const allTags = [
    ...new Set([
      primaryCategory,
      ...strategicTags,
      ...secondaryTags.map((t) => t.toLowerCase().replace(/\s+/g, "-")),
      ...secondaryTags,
    ]),
  ];

  return {
    primaryCategory,
    secondaryTags,
    strategicTags,
    allTags,
    entityIds,
  };
}
