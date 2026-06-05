import { storyMatchesTag } from "@/lib/intelligence/story-tags";
import { isNoiseStory } from "@/lib/signal/strategic-score";
import {
  SIGNAL_DEFINITIONS,
  storyMatchesSignal,
  type SignalDefinition,
} from "@/lib/signals/catalog";
import type { Story } from "@/lib/types";

const RISING_COPY: Partial<Record<string, string>> = {
  "ai-infrastructure":
    "Increasing discussion around datacenter investment, GPUs, and cloud expansion.",
  semiconductors:
    "More coverage of chip supply, foundry capacity, and AI accelerator demand.",
  "energy-risk":
    "Rising attention on supply disruptions, commodity moves, and infrastructure stress.",
  "rates-liquidity":
    "Markets are weighing policy, liquidity, and financial stability signals.",
  "china-capital":
    "Cross-border capital flows and geopolitical risk are drawing more coverage.",
  "policy-regulation":
    "Regulatory and legislative moves are moving up the news agenda.",
  "cyber-risk": "Security incidents and cyber policy are gaining traction.",
  "defense-spending": "Defense budgets and procurement are in focus.",
};

const FALLING_COPY: Partial<Record<string, string>> = {
  "consumer-demand":
    "Consumer and retail narratives are losing share of voice versus prior weeks.",
  "saas-enterprise":
    "Enterprise software headlines are quieter relative to infrastructure and AI.",
  "ev-growth": "Clean-tech and EV story volume is easing from recent peaks.",
};

function signalMatchStrength(story: Story, def: SignalDefinition): number {
  if (!storyMatchesSignal(story, def)) return 0;
  if (story.lowSignal || story.signalClass === "noise" || isNoiseStory(story)) {
    return 0;
  }

  let strength = 1;
  if (def.tags?.some((t) => storyMatchesTag(story, t))) strength += 3;
  if (def.secondary?.some((s) => story.secondaryTags?.includes(s))) strength += 2;
  if (def.themes?.includes(story.narrativeTheme ?? "")) strength += 2;
  strength += (story.importanceScore ?? 5) / 10;
  strength += (story.corroborationScore ?? 0) * 2;
  if ((story.clusterSize ?? 1) > 1) strength += 1;
  return strength;
}

function matchedStories(stories: Story[], def: SignalDefinition): Story[] {
  return stories
    .map((s) => ({ story: s, strength: signalMatchStrength(s, def) }))
    .filter((x) => x.strength >= 2)
    .sort(
      (a, b) =>
        b.strength - a.strength ||
        Date.parse(b.story.publishedAt) - Date.parse(a.story.publishedAt) ||
        (b.story.importanceScore ?? 0) - (a.story.importanceScore ?? 0)
    )
    .map((x) => x.story);
}

export function explainSignalMomentum(
  signalId: string,
  direction: "rising" | "falling",
  stories: Story[]
): string {
  const def = SIGNAL_DEFINITIONS.find((d) => d.id === signalId);
  if (!def) {
    return direction === "rising"
      ? "This signal is gaining attention in the current feed."
      : "This signal is losing attention versus the prior week.";
  }

  const preset =
    direction === "rising" ? RISING_COPY[signalId] : FALLING_COPY[signalId];
  if (preset) return preset;

  const matched = matchedStories(stories, def);
  const sources = new Set(matched.map((s) => s.source)).size;

  if (direction === "rising") {
    return `More stories tagging ${def.label.toLowerCase()} in the last 48 hours — ${matched.length} articles across ${sources} outlets.`;
  }

  return `Coverage of ${def.label.toLowerCase()} is softer than the prior week — ${matched.length} stories still in the pool.`;
}

export function relatedStoriesForSignal(
  signalId: string,
  stories: Story[],
  limit = 5
): { slug: string; headline: string; source: string; publishedAt: string }[] {
  const def = SIGNAL_DEFINITIONS.find((d) => d.id === signalId);
  if (!def) return [];

  return matchedStories(stories, def).slice(0, limit).map((s) => ({
    slug: s.slug,
    headline: s.headline,
    source: s.source,
    publishedAt: s.publishedAt,
  }));
}

export function whySignalMatters(signalId: string): string {
  const def = SIGNAL_DEFINITIONS.find((d) => d.id === signalId);
  if (!def) {
    return "This signal tracks a strategic theme across the intelligence landscape.";
  }

  return `${def.label} sits at the intersection of policy, markets, and technology — shifts here often precede broader narrative moves in your feed.`;
}
