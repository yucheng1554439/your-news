import type { Story } from "@/lib/types";

const STORY_DEFAULTS = {
  whyItMatters: "Verification fixture.",
  importance: "high" as const,
  imageUrl: "/placeholder.jpg",
  readTime: 4,
};

function story(partial: Omit<Story, "whyItMatters" | "importance" | "imageUrl" | "readTime"> & Partial<Pick<Story, "whyItMatters" | "importance" | "imageUrl" | "readTime">>): Story {
  return { ...STORY_DEFAULTS, ...partial };
}

/** Minimal corpus for multi-user isolation verification. */
export const VERIFY_STORY_FIXTURES: Story[] = [
  story({
    slug: "verify-ai-gpu-cluster-expansion",
    headline: "Hyperscalers expand GPU clusters for frontier model training",
    summary:
      "Cloud providers announce multi-billion dollar AI infrastructure buildouts across US and EU regions.",
    source: "Verify Wire",
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    category: "ai",
    primaryCategory: "ai",
    tags: ["ai-infrastructure", "semiconductors", "enterprise-ai"],
    importanceScore: 9,
    strategicSignal: 0.92,
    corroborationScore: 0.8,
    clusterSize: 4,
  }),
  story({
    slug: "verify-ai-open-source-weights",
    headline: "Open-source foundation model release targets enterprise inference",
    summary:
      "A new open weights release focuses on efficient inference for AI infrastructure teams.",
    source: "Verify Wire",
    publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    category: "ai",
    primaryCategory: "ai",
    tags: ["open-source-ai", "ai-infrastructure", "developer-tools"],
    importanceScore: 8,
    strategicSignal: 0.85,
    corroborationScore: 0.7,
    clusterSize: 3,
  }),
  story({
    slug: "verify-markets-fed-rates",
    headline: "Capital markets reprice rate path after central bank signals",
    summary:
      "Equity and bond desks adjust positioning as capital markets digest updated rate guidance.",
    source: "Verify Wire",
    publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    category: "markets",
    primaryCategory: "markets",
    tags: ["capital-markets", "macro", "rates"],
    importanceScore: 9,
    strategicSignal: 0.88,
    corroborationScore: 0.75,
    clusterSize: 5,
  }),
  story({
    slug: "verify-markets-earnings-banks",
    headline: "Major banks beat estimates as trading desks drive capital markets revenue",
    summary:
      "Finance sector earnings highlight capital markets activity and fixed income strength.",
    source: "Verify Wire",
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    category: "markets",
    primaryCategory: "markets",
    tags: ["capital-markets", "finance", "banks"],
    importanceScore: 8,
    strategicSignal: 0.82,
    corroborationScore: 0.65,
    clusterSize: 3,
  }),
  story({
    slug: "verify-neutral-energy-policy",
    headline: "Energy policy shift draws bipartisan capital and infrastructure attention",
    summary: "Cross-sector energy update with limited personalization signal.",
    source: "Verify Wire",
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    category: "energy",
    primaryCategory: "energy",
    tags: ["energy", "policy"],
    importanceScore: 6,
    strategicSignal: 0.5,
    corroborationScore: 0.4,
    clusterSize: 2,
  }),
];

export const VERIFY_AI_STORY = VERIFY_STORY_FIXTURES[0];
export const VERIFY_FINANCE_STORY = VERIFY_STORY_FIXTURES[2];
