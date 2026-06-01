import { detectNarrativeTheme } from "@/lib/editorial/narrative-clusters";
import { THEME_LABELS } from "@/lib/briefing/narrative-synthesis";
import { storyMatchesTag } from "@/lib/intelligence/story-tags";
import { tagDisplayLabel } from "@/lib/personalization/tag-labels";
import type { Story } from "@/lib/types";

export type SignalDefinition = {
  id: string;
  label: string;
  /** Strategic tags / categories that activate this signal */
  tags?: string[];
  /** Narrative cluster themes */
  themes?: string[];
  /** Secondary tag labels (display form) */
  secondary?: string[];
  headline?: RegExp;
};

/** Curated desk signals — terminal-style labels, not raw tags. */
export const SIGNAL_DEFINITIONS: SignalDefinition[] = [
  {
    id: "ai-infrastructure",
    label: "AI Infrastructure",
    tags: ["ai-infrastructure", "ai", "cloud-infrastructure"],
    themes: ["ai-capex", "hyperscaler-cloud"],
    secondary: ["Datacenters", "Cloud"],
  },
  {
    id: "semiconductors",
    label: "Semiconductors",
    tags: ["semiconductors"],
    themes: ["nvidia-semis"],
    secondary: ["Semiconductors", "TSMC", "Nvidia"],
  },
  {
    id: "open-source-models",
    label: "Open Source Models",
    tags: ["open-source-ai", "enterprise-ai"],
    themes: ["big-tech-ai"],
  },
  {
    id: "defense-spending",
    label: "Defense Spending",
    secondary: ["Defense"],
    headline: /\b(pentagon|defense spending|military aid|weapons|nato)\b/i,
  },
  {
    id: "energy-risk",
    label: "Energy Risk",
    tags: ["energy", "infrastructure"],
    themes: ["energy-commodities"],
    secondary: ["Oil & Gas"],
  },
  {
    id: "china-capital",
    label: "China Capital Mobilization",
    secondary: ["China", "Taiwan"],
    tags: ["geopolitics", "markets", "supply-chain"],
    themes: ["geopolitics-conflict"],
  },
  {
    id: "rates-liquidity",
    label: "Rates & Liquidity",
    tags: ["markets", "investing", "banking-financial"],
    themes: ["fed-rates", "banking-financial"],
    secondary: ["Rates"],
  },
  {
    id: "policy-regulation",
    label: "Policy & Regulation",
    tags: ["policy"],
    themes: ["policy-regulation"],
  },
  {
    id: "cyber-risk",
    label: "Cyber Risk",
    tags: ["cybersecurity"],
    themes: ["cyber-breach"],
  },
  {
    id: "saas-enterprise",
    label: "Enterprise Software",
    tags: ["enterprise-ai", "startups"],
    themes: ["ai-capex"],
  },
  {
    id: "consumer-demand",
    label: "Consumer Demand",
    tags: ["consumer-tech", "consumer-ai", "gaming"],
  },
  {
    id: "ev-growth",
    label: "EV & Clean Tech",
    tags: ["energy"],
    headline: /\b(electric vehicle|ev\b|battery plant|ev sales)\b/i,
  },
  {
    id: "layoffs-hiring",
    label: "Tech Labor",
    headline: /\b(layoff|job cuts|hiring freeze|headcount)\b/i,
    tags: ["startups"],
  },
  {
    id: "supply-chain",
    label: "Supply Chain",
    tags: ["supply-chain"],
    secondary: ["Supply Chain"],
  },
  {
    id: "datacenter-build",
    label: "Datacenter Buildout",
    secondary: ["Datacenters"],
    tags: ["ai-infrastructure"],
  },
];

const THEME_TO_SIGNAL: Partial<Record<string, string>> = {
  "nvidia-semis": "semiconductors",
  "ai-capex": "ai-infrastructure",
  "hyperscaler-cloud": "ai-infrastructure",
  "fed-rates": "rates-liquidity",
  "geopolitics-conflict": "china-capital",
  "energy-commodities": "energy-risk",
  "big-tech-ai": "open-source-models",
  "cyber-breach": "cyber-risk",
  "policy-regulation": "policy-regulation",
  "banking-financial": "rates-liquidity",
};

export function storyMatchesSignal(story: Story, def: SignalDefinition): boolean {
  if (def.tags?.some((t) => storyMatchesTag(story, t))) return true;

  const theme = story.narrativeTheme ?? detectNarrativeTheme(story);
  if (def.themes?.includes(theme)) return true;
  if (THEME_TO_SIGNAL[theme] === def.id) return true;

  if (def.secondary?.some((s) => story.secondaryTags?.includes(s))) return true;

  if (def.headline) {
    const blob = `${story.headline} ${story.summary}`;
    def.headline.lastIndex = 0;
    if (def.headline.test(blob)) return true;
  }

  return false;
}

export function resolveSignalLabel(id: string): string {
  const def = SIGNAL_DEFINITIONS.find((d) => d.id === id);
  if (def) return def.label;
  return tagDisplayLabel(id);
}

export function themeLabelForSignal(theme: string): string {
  const mapped = THEME_TO_SIGNAL[theme];
  if (mapped) return resolveSignalLabel(mapped);
  const fromTheme = THEME_LABELS[theme as keyof typeof THEME_LABELS];
  if (fromTheme) {
    return fromTheme
      .split(/[&,]/)
      .map((s) => s.trim().replace(/^\w/, (c) => c.toUpperCase()))
      .slice(0, 1)
      .join(" ");
  }
  return tagDisplayLabel(theme);
}
