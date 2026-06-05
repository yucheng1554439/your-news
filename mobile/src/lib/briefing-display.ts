import { resolveBriefingAction, type BriefingActionContext } from "@/lib/briefing-action";
import { coerceDistinctForYouSections } from "@/lib/for-you-section-coherence";
import {
  deriveImpactFallbackFromBriefing,
  isGenericBriefingSection,
  isNoDirectImpactText,
} from "@/lib/briefing-impact-fallback";
import type {
  BriefingBundle,
  BriefingMode,
  IntelligenceBriefing,
} from "@/types";

const SECTION_HEADERS = new Set([
  "What Changed",
  "Why It Matters To You",
  "Why It Matters",
  "What To Watch",
  "Action / Positioning",
  "Would Change If",
]);

export function normalizeBriefing(
  briefing: IntelligenceBriefing
): IntelligenceBriefing {
  return {
    ...briefing,
    periodLabel: briefing.periodLabel ?? briefing.weekLabel ?? "",
    provenance: briefing.provenance ?? {
      articleCount: 0,
      narrativeCount: 0,
      sourceCount: 0,
      sources: [],
    },
    summary: briefing.summary ?? "",
    keySignal: briefing.keySignal ?? "",
    headline: briefing.headline ?? "",
  };
}

export function formatBriefingForDisplay(
  briefing: IntelligenceBriefing
): string {
  const blocks: string[] = [];

  if (briefing.whatChanged?.trim()) {
    blocks.push(`What Changed\n${briefing.whatChanged.trim()}`);
  }

  const why =
    briefing.whyYou?.trim() ||
    (briefing.mode === "for-you"
      ? undefined
      : briefing.whyItMatters?.trim());
  if (why) {
    blocks.push(
      `${briefing.mode === "for-you" ? "Why It Matters To You" : "Why It Matters"}\n${why}`
    );
  }

  if (briefing.watchItems && briefing.watchItems.length > 0) {
    const bullets = briefing.watchItems.map((w) => `• ${w.trim()}`).join("\n");
    blocks.push(`What To Watch\n${bullets}`);
  } else if (briefing.keySignal?.trim()) {
    blocks.push(`What To Watch\n• ${briefing.keySignal.trim()}`);
  }

  const action =
    briefing.positioning?.trim() || briefing.decisions?.trim();
  if (action) {
    blocks.push(`Action / Positioning\n${action}`);
  }

  if (briefing.invalidateIf?.trim() && briefing.mode === "for-you") {
    blocks.push(`Would Change If\n${briefing.invalidateIf.trim()}`);
  }

  if (blocks.length > 0) return blocks.join("\n\n");
  return briefing.summary?.trim() ?? "";
}

export type BriefingSection = {
  title?: string;
  body: string;
};

export function parseBriefingSections(text: string): BriefingSection[] {
  const blocks = text.split(/\n\n+/).filter(Boolean);
  return blocks.map((block) => {
    const lines = block.split("\n");
    const first = lines[0]?.trim() ?? "";
    if (SECTION_HEADERS.has(first)) {
      return {
        title: first,
        body: lines.slice(1).join("\n").trim(),
      };
    }
    return { body: block.trim() };
  });
}

export function selectBriefing(
  briefings: BriefingBundle,
  mode: BriefingMode
): IntelligenceBriefing | null {
  const cached = briefings[mode];
  if (!cached || cached.mode !== mode) return null;
  return normalizeBriefing(cached);
}

export function intelligenceModeLabel(mode: BriefingMode): string {
  return mode === "for-you" ? "For You Intelligence" : "Global Intelligence";
}

export type BriefingDisplaySection = {
  key: string;
  label: string;
  shortLabel: string;
  body: string;
  highlight?: boolean;
  isFallback?: boolean;
};

const BRIEFING_FALLBACKS = {
  whatChanged:
    "Several narrative threads developed in parallel — see source coverage for corroboration.",
  whyItMatters:
    "Cross-cluster patterns this period may shift capital flows, policy timelines, or competitive positioning if follow-up reporting confirms direction.",
  whatToWatch:
    "Watch for tier-1 follow-up that confirms or reverses the lead threads in this brief.",
};

function pickBriefingText(...candidates: (string | undefined | null)[]): string | null {
  for (const c of candidates) {
    const t = c?.trim();
    if (t) return t;
  }
  return null;
}

/** Swipeable briefing cards — For You vs Global section order. */
export function buildBriefingSections(
  briefing: IntelligenceBriefing,
  context?: BriefingActionContext
): BriefingDisplaySection[] {
  const normalized = normalizeBriefing(briefing);
  const sections: BriefingDisplaySection[] = [];

  const whatChanged =
    pickBriefingText(normalized.whatChanged, normalized.summary) ??
    BRIEFING_FALLBACKS.whatChanged;

  sections.push({
    key: "what-changed",
    label: "Overview",
    shortLabel: "Overview",
    body: whatChanged,
    isFallback: !pickBriefingText(normalized.whatChanged),
  });

  if (normalized.mode === "for-you") {
    const rawWhy = pickBriefingText(normalized.whyYou);
    const whyYou =
      rawWhy &&
      !isNoDirectImpactText(rawWhy) &&
      !isGenericBriefingSection(rawWhy)
        ? rawWhy
        : deriveImpactFallbackFromBriefing(
            normalized,
            context?.profile ?? null,
            context?.userIntelligence ?? null
          );

    sections.push({
      key: "why-you",
      label: "Impact",
      shortLabel: "Impact",
      body: whyYou,
      highlight: true,
      isFallback: !rawWhy || isNoDirectImpactText(rawWhy) || isGenericBriefingSection(rawWhy),
    });
  } else {
    const whyItMatters =
      pickBriefingText(normalized.whyItMatters) ?? BRIEFING_FALLBACKS.whyItMatters;

    sections.push({
      key: "why-it-matters",
      label: "Impact",
      shortLabel: "Impact",
      body: whyItMatters,
      isFallback: !pickBriefingText(normalized.whyItMatters),
    });
  }

  const watchFromItems =
    normalized.watchItems && normalized.watchItems.length > 0
      ? normalized.watchItems
          .map((w) => w.replace(/^[-•*]\s*/, "").trim())
          .filter(Boolean)
          .join("\n\n")
      : null;

  const whatToWatch =
    pickBriefingText(watchFromItems, normalized.keySignal) ??
    BRIEFING_FALLBACKS.whatToWatch;

  sections.push({
    key: "what-to-watch",
    label: "Watch",
    shortLabel: "Watch",
    body: whatToWatch,
    isFallback: !pickBriefingText(watchFromItems, normalized.keySignal),
  });

  const action = resolveBriefingAction(
    normalized,
    context ?? { profile: null, userIntelligence: null }
  );

  sections.push({
    key: "action",
    label: "Action",
    shortLabel: "Action",
    body: action.body,
    isFallback: action.isNoAction,
    highlight: !action.isNoAction,
  });

  if (normalized.mode === "for-you") {
    return coerceDistinctForYouSections(
      sections,
      normalized,
      context?.profile ?? null,
      context?.userIntelligence ?? null
    );
  }

  return sections;
}