import "server-only";

import { formatBriefingForDisplay } from "@/lib/briefing/format-display";
import { logBriefing } from "@/lib/briefing/briefing-log";
import {
  deriveFallbackHeadline,
  deriveFallbackSummary,
  isListLikeHeadline,
  normalizeKeySignal,
  normalizeWeeklySummary,
} from "@/lib/briefing/format-weekly";
import { normalizeThesisHeadline } from "@/lib/briefing/thesis-title";
import { deriveKeySignal } from "@/lib/briefing/key-signal";
import { recordAIResponse } from "@/lib/intelligence/latest-ai-response";
import {
  emptyParseSectionStatus,
  logParseFailure,
  logParseRecovered,
  logParseSections,
  type ParseSectionStatus,
} from "@/lib/intelligence/parse-log";
import {
  briefingContainsRefusal,
  isModelRefusal,
  responseLooksLikeRefusal,
} from "@/lib/intelligence/model-refusal";
import { intelligenceGeneratedByProvider } from "@/lib/intelligence/provider";
import {
  sanitizeGroundedProse,
  violatesGroundedTone,
} from "@/lib/intelligence/writing-guardrails";
import { extractJsonPayload } from "@/lib/intelligence/provider/extract-json";
import {
  extractTaggedSections,
  firstProseParagraph,
  listFoundTags,
  pickTaggedSection,
  splitProseBlocks,
} from "@/lib/intelligence/provider/extract-tags";
import type {
  BriefingCadence,
  BriefingMode,
  BriefingProvenance,
  IntelligenceBriefing,
} from "@/lib/briefing/types";
import type { OnboardingProfile, Story } from "@/lib/types";

const HEADLINE_ALIASES = ["HEADLINE", "TITLE", "THESIS"];
const SUMMARY_ALIASES = ["SUMMARY", "BRIEFING", "WEEKLY_BRIEFING", "SYNTHESIS"];
const WHAT_CHANGED_ALIASES = ["WHAT_CHANGED", "WHAT_CHANGED_TODAY", "CHANGED"];
const WHY_YOU_ALIASES = [
  "WHY_YOU",
  "WHY_IT_MATTERS_TO_YOU",
  "WHY_THIS_MATTERS_TO_YOU",
];
const WHY_WORLD_ALIASES = ["WHY_IT_MATTERS", "WHY_THIS_MATTERS", "IMPLICATIONS"];
const WATCH_ALIASES = ["WATCH", "WHAT_TO_WATCH", "MONITOR", "KEY_SIGNAL"];
const POSITIONING_ALIASES = [
  "POSITIONING",
  "ACTION",
  "DECISIONS",
  "DECISION",
  "ACTIONS",
];
const INVALIDATE_ALIASES = [
  "INVALIDATE",
  "INVALIDATE_THESIS",
  "IF_WRONG",
  "WOULD_CHANGE_IF",
];

const REQUIRED_FOR_MODE: Record<
  BriefingMode,
  { tags: string[]; statusKey: keyof ParseSectionStatus }[]
> = {
  global: [
    { tags: HEADLINE_ALIASES, statusKey: "title" },
    { tags: WHAT_CHANGED_ALIASES, statusKey: "whatChanged" },
    { tags: WHY_WORLD_ALIASES, statusKey: "whyItMatters" },
  ],
  "for-you": [
    { tags: HEADLINE_ALIASES, statusKey: "title" },
    { tags: WHAT_CHANGED_ALIASES, statusKey: "whatChanged" },
    { tags: WHY_YOU_ALIASES, statusKey: "whyYou" },
  ],
};

function parseWatchBullets(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(/\n+/)
    .map((line) => line.replace(/^[\s•\-*]+/, "").trim())
    .filter((line) => line.length > 4)
    .slice(0, 4);
}

function minSummaryLength(cadence: BriefingCadence, structured: boolean): number {
  if (structured) return cadence === "weekly" ? 24 : 28;
  return cadence === "weekly" ? 40 : 48;
}

function buildParseStatus(
  sections: ReturnType<typeof extractTaggedSections>,
  mode: BriefingMode
): ParseSectionStatus {
  const status = emptyParseSectionStatus();
  status.title = Boolean(pickTaggedSection(sections, HEADLINE_ALIASES));
  status.whatChanged = Boolean(
    pickTaggedSection(sections, WHAT_CHANGED_ALIASES) ||
      pickTaggedSection(sections, SUMMARY_ALIASES)
  );
  status.whyYou = Boolean(pickTaggedSection(sections, WHY_YOU_ALIASES));
  status.whyItMatters = Boolean(pickTaggedSection(sections, WHY_WORLD_ALIASES));
  status.watch = Boolean(pickTaggedSection(sections, WATCH_ALIASES));
  status.action = Boolean(pickTaggedSection(sections, POSITIONING_ALIASES));
  status.invalidate = Boolean(pickTaggedSection(sections, INVALIDATE_ALIASES));
  return status;
}

function missingRequiredTags(
  sections: ReturnType<typeof extractTaggedSections>,
  mode: BriefingMode
): string[] {
  const missing: string[] = [];
  for (const req of REQUIRED_FOR_MODE[mode]) {
    if (!pickTaggedSection(sections, req.tags)) {
      missing.push(req.tags[0]!);
    }
  }
  return missing;
}

function safeProse(text: string): string {
  const cleaned = sanitizeGroundedProse(text.trim());
  return cleaned || text.trim();
}

function parseFromJson(
  content: string,
  mode: BriefingMode,
  selected: Story[],
  periodLabel: string,
  profile: OnboardingProfile | null,
  cadence: BriefingCadence,
  provenance: BriefingProvenance,
  label: string
): IntelligenceBriefing | null {
  try {
    const jsonText = extractJsonPayload(content);
    const parsed = JSON.parse(jsonText) as {
      headline?: string;
      title?: string;
      summary?: string;
      whatChanged?: string;
      keySignal?: string;
      editorsNote?: string;
    };

    const headline = (parsed.headline ?? parsed.title)?.trim() ?? "";
    const summary = (parsed.whatChanged ?? parsed.summary)?.trim() ?? "";
    if (!headline && !summary) return null;

    logParseSections(label, {
      ...emptyParseSectionStatus(),
      title: Boolean(headline),
      whatChanged: Boolean(summary),
    }, "json");

    return finalizeBriefing({
      mode,
      cadence,
      periodLabel,
      provenance,
      headline,
      whatChanged: summary,
      keySignal:
        parsed.keySignal?.trim() ||
        parsed.editorsNote?.trim() ||
        deriveKeySignal(selected),
      selected,
      profile,
      label,
    });
  } catch {
    return null;
  }
}

function finalizeBriefing(input: {
  mode: BriefingMode;
  cadence: BriefingCadence;
  periodLabel: string;
  provenance: BriefingProvenance;
  headline: string;
  whatChanged?: string;
  whyYou?: string;
  whyItMatters?: string;
  watchItems?: string[];
  positioning?: string;
  keySignal: string;
  invalidateIf?: string;
  selected: Story[];
  profile?: OnboardingProfile | null;
  label: string;
  filledFields?: string[];
}): IntelligenceBriefing | null {
  const fallbackTitle = deriveFallbackHeadline(
    input.selected,
    input.mode,
    input.profile ?? null
  );
  const fallbackSummary = deriveFallbackSummary(
    input.selected,
    input.mode,
    input.profile ?? null
  );

  let headline = input.headline.trim();
  let whatChanged = safeProse((input.whatChanged ?? "").trim());
  const whyYou = input.whyYou?.trim()
    ? safeProse(input.whyYou.trim())
    : undefined;
  const whyItMatters = input.whyItMatters?.trim()
    ? safeProse(input.whyItMatters.trim())
    : undefined;
  const watchItems =
    input.watchItems && input.watchItems.length > 0
      ? input.watchItems.map((w) => safeProse(w))
      : undefined;
  let positioning = input.positioning?.trim()
    ? safeProse(input.positioning.trim())
    : undefined;
  const invalidateIf = input.invalidateIf?.trim()
    ? safeProse(input.invalidateIf.trim())
    : undefined;

  const filled = [...(input.filledFields ?? [])];

  if (!headline) {
    if (whatChanged) {
      headline =
        whatChanged.match(/^[^.!?]+[.!?]/)?.[0]?.trim() ??
        compressFirstSentence(whatChanged);
    }
    if (!headline) headline = fallbackTitle;
    filled.push("headline");
  }

  if (!whatChanged) {
    whatChanged =
      whyYou ??
      whyItMatters ??
      safeProse(fallbackSummary.split(/\n\n/)[0] ?? fallbackSummary);
    filled.push("what_changed");
  }

  if (input.mode === "for-you" && !positioning) {
    positioning =
      "Review exposure and timing against the facts above before acting.";
    filled.push("action");
  }

  let keySignal = input.keySignal.trim();
  if (!keySignal && watchItems?.[0]) keySignal = watchItems[0];
  if (!keySignal) keySignal = deriveKeySignal(input.selected);
  keySignal = normalizeKeySignal(safeProse(keySignal));

  if (isListLikeHeadline(headline)) {
    headline = fallbackTitle;
    filled.push("headline_list_fix");
  }

  headline = normalizeThesisHeadline(
    headline,
    input.mode,
    input.cadence,
    fallbackTitle
  );
  headline = safeProse(headline);

  if (!headline || headline.length < 6) {
    headline = fallbackTitle;
    filled.push("headline_short");
  }

  const draft: IntelligenceBriefing = {
    cadence: input.cadence,
    mode: input.mode,
    periodLabel: input.periodLabel,
    weekLabel: input.periodLabel,
    headline,
    summary: "",
    keySignal,
    provenance: input.provenance,
    whatChanged: whatChanged || undefined,
    whyYou,
    whyItMatters,
    watchItems,
    positioning,
    decisions: positioning,
    invalidateIf,
    generatedBy: intelligenceGeneratedByProvider(),
    generatedAt: Date.now(),
  };

  draft.summary = formatBriefingForDisplay(draft);

  if (!draft.summary || draft.summary.length < minSummaryLength(input.cadence, true)) {
    const padded = normalizeWeeklySummary(
      `${whatChanged} ${whyYou ?? whyItMatters ?? ""}`.trim() ||
        fallbackSummary,
      input.mode
    );
    draft.summary = padded;
    filled.push("summary");
  } else {
    draft.summary = normalizeWeeklySummary(draft.summary, input.mode);
  }

  const combined = `${draft.headline} ${draft.summary}`;
  if (violatesGroundedTone(combined)) {
    logBriefing(
      input.cadence,
      input.mode,
      "parse warn",
      "tone flags present — keeping recovered briefing"
    );
  }

  if (filled.length > 0) {
    logParseRecovered(input.label, buildParseStatusFromParts(input), filled);
  }

  if (briefingContainsRefusal(draft)) {
    logBriefing(
      input.cadence,
      input.mode,
      "parse refused",
      "model decline text in briefing fields"
    );
    return null;
  }

  logBriefing(input.cadence, input.mode, "parse succeeded");
  return draft;
}

function buildParseStatusFromParts(input: {
  headline: string;
  whatChanged?: string;
  whyYou?: string;
  whyItMatters?: string;
  watchItems?: string[];
  positioning?: string;
  invalidateIf?: string;
}): ParseSectionStatus {
  return {
    title: Boolean(input.headline?.trim()),
    whatChanged: Boolean(input.whatChanged?.trim()),
    whyYou: Boolean(input.whyYou?.trim()),
    whyItMatters: Boolean(input.whyItMatters?.trim()),
    watch: Boolean(input.watchItems?.length),
    action: Boolean(input.positioning?.trim()),
    invalidate: Boolean(input.invalidateIf?.trim()),
  };
}

function compressFirstSentence(text: string): string {
  return text.match(/^[^.!?]+[.!?]/)?.[0]?.trim() ?? text.slice(0, 120).trim();
}

function parseFromTags(
  content: string,
  mode: BriefingMode,
  selected: Story[],
  periodLabel: string,
  profile: OnboardingProfile | null,
  cadence: BriefingCadence,
  provenance: BriefingProvenance,
  label: string
): IntelligenceBriefing | null {
  if (responseLooksLikeRefusal(content)) {
    const sections = extractTaggedSections(content);
    const hasBody = Boolean(
      pickTaggedSection(sections, WHAT_CHANGED_ALIASES) ||
        pickTaggedSection(sections, SUMMARY_ALIASES)
    );
    if (!hasBody) {
      logBriefing(cadence, mode, "parse refused", "untagged model decline");
      return null;
    }
  }

  const sections = extractTaggedSections(content);
  const foundTags = listFoundTags(sections);
  const status = buildParseStatus(sections, mode);
  const missing = missingRequiredTags(sections, mode);

  logParseSections(label, status, `tags=[${foundTags.join(", ")}]`);

  let headline = pickTaggedSection(sections, HEADLINE_ALIASES) ?? "";
  let whatChanged =
    pickTaggedSection(sections, WHAT_CHANGED_ALIASES) ??
    pickTaggedSection(sections, SUMMARY_ALIASES) ??
    "";
  const whyYou = pickTaggedSection(sections, WHY_YOU_ALIASES) ?? "";
  const whyItMatters = pickTaggedSection(sections, WHY_WORLD_ALIASES) ?? "";
  const watchRaw = pickTaggedSection(sections, WATCH_ALIASES) ?? "";
  const positioning = pickTaggedSection(sections, POSITIONING_ALIASES) ?? "";
  const invalidateIf = pickTaggedSection(sections, INVALIDATE_ALIASES) ?? "";

  const filledFields: string[] = [];

  if (!headline && !whatChanged) {
    const blocks = splitProseBlocks(content, 32).filter((b) => !isModelRefusal(b));
    if (blocks.length >= 1) {
      headline = blocks[0]!;
      filledFields.push("headline_prose");
    }
    if (blocks.length >= 2 && !whatChanged) {
      whatChanged = blocks.slice(1).join("\n\n");
      filledFields.push("what_changed_prose");
    }
    if (!whatChanged) {
      whatChanged = firstProseParagraph(content, 28);
      if (whatChanged) filledFields.push("what_changed_paragraph");
    }
  }

  if (!headline && whatChanged) {
    headline = compressFirstSentence(whatChanged);
    filledFields.push("headline_from_body");
  }

  if (!whatChanged && (whyYou || whyItMatters)) {
    whatChanged = whyYou || whyItMatters;
    filledFields.push("what_changed_from_why");
  }

  const watchItems = parseWatchBullets(watchRaw);
  const hasMinimum = Boolean(headline.trim() || whatChanged.trim());

  if (!hasMinimum) {
    logParseFailure({
      label,
      cadence,
      mode,
      rawLength: content.length,
      foundTags,
      missingTags: missing,
      status,
      reason: "no title or body after recovery",
      rawPreview: content,
    });
    return null;
  }

  if (missing.length > 0) {
    logParseFailure({
      label,
      cadence,
      mode,
      rawLength: content.length,
      foundTags,
      missingTags: missing,
      status,
      reason: "partial — filling missing sections",
      rawPreview: content.slice(0, 300),
    });
  }

  return finalizeBriefing({
    mode,
    cadence,
    periodLabel,
    provenance,
    headline,
    whatChanged,
    whyYou: mode === "for-you" ? whyYou : undefined,
    whyItMatters: mode === "global" ? whyItMatters : undefined,
    watchItems,
    positioning,
    keySignal: watchItems[0] ?? watchRaw,
    invalidateIf: mode === "for-you" ? invalidateIf : undefined,
    selected,
    profile,
    label,
    filledFields,
  });
}

export function parseWeeklyBriefingResponse(
  content: string,
  mode: BriefingMode,
  selected: Story[],
  periodLabel: string,
  profile: OnboardingProfile | null = null,
  cadence: BriefingCadence = "weekly",
  provenance?: BriefingProvenance
): IntelligenceBriefing | null {
  const trimmed = content.trim();
  const label = `Briefing · ${cadence} · ${mode}`;

  if (!trimmed) {
    logBriefing(cadence, mode, "parse failed", "empty response");
    recordAIResponse({
      label,
      provider: intelligenceGeneratedByProvider() as "anthropic" | "openai",
      format: "tags",
      ok: false,
      error: "empty response",
      raw: "",
      missingTags: ["HEADLINE", "WHAT_CHANGED"],
      foundTags: [],
    });
    return null;
  }

  const prov =
    provenance ??
    ({
      articleCount: selected.length,
      narrativeCount: 1,
      sourceCount: new Set(selected.map((s) => s.source)).size,
      sources: [...new Set(selected.map((s) => s.source))].slice(0, 12),
    } satisfies BriefingProvenance);

  const fromTags = parseFromTags(
    trimmed,
    mode,
    selected,
    periodLabel,
    profile,
    cadence,
    prov,
    label
  );
  if (fromTags) return fromTags;

  const fromJson = parseFromJson(
    trimmed,
    mode,
    selected,
    periodLabel,
    profile,
    cadence,
    prov,
    label
  );
  if (fromJson) return fromJson;

  const sections = extractTaggedSections(trimmed);
  const status = buildParseStatus(sections, mode);
  const foundTags = listFoundTags(sections);
  const missing = missingRequiredTags(sections, mode);

  logParseFailure({
    label,
    cadence,
    mode,
    rawLength: trimmed.length,
    foundTags,
    missingTags: missing,
    status,
    reason: "no tags or JSON",
    rawPreview: trimmed,
  });

  recordAIResponse({
    label,
    provider: intelligenceGeneratedByProvider() as "anthropic" | "openai",
    format: "tags",
    ok: false,
    error: "Could not parse tagged response",
    raw: trimmed,
    parseStatus: status,
    missingTags: missing,
    foundTags,
  });

  logBriefing(cadence, mode, "parse failed", "no tags or JSON");
  return null;
}
