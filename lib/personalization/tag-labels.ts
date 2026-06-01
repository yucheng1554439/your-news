import { getCategoryLabel } from "@/lib/data/categories";
import type { StoryCategory } from "@/lib/types";

const TAG_LABELS: Record<string, string> = {
  ai: "AI",
  "ai-infrastructure": "AI Infrastructure",
  "consumer-ai": "Consumer AI",
  "enterprise-ai": "Enterprise AI",
  "open-source-ai": "Open Source AI",
  semiconductors: "Semiconductors",
  "cloud-infrastructure": "Cloud Infrastructure",
  "developer-tools": "Developer Tools",
  robotics: "Robotics",
  gaming: "Gaming",
  "consumer-tech": "Consumer Tech",
  markets: "Markets",
  investing: "Investing",
  startups: "Startups",
  geopolitics: "Geopolitics",
  energy: "Energy",
  cybersecurity: "Cybersecurity",
  infrastructure: "Infrastructure",
  policy: "Policy",
  science: "Science",
  sports: "Sports",
  "supply-chain": "Supply Chain",
  "banking-financial": "Banking & Financial",
};

export function tagDisplayLabel(tag: string): string {
  return (
    TAG_LABELS[tag] ??
    tag
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

export function categoryDisplayLabel(category: string): string {
  try {
    return getCategoryLabel(category as StoryCategory);
  } catch {
    return categoryDisplayLabelFallback(category);
  }
}

function categoryDisplayLabelFallback(category: string): string {
  return category
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function topStoryCategoryLabel(id: string): string {
  const map: Record<string, string> = {
    all: "All",
    ai: "AI",
    markets: "Markets",
    geopolitics: "Geopolitics",
    energy: "Energy",
    cybersecurity: "Cybersecurity",
    science: "Science",
    sports: "Sports",
  };
  return map[id] ?? categoryDisplayLabel(id);
}
