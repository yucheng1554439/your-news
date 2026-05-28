import "server-only";

import {
  deriveFallbackHeadline,
  isListLikeHeadline,
  normalizeKeySignal,
  normalizeWeeklyHeadline,
  normalizeWeeklySummary,
} from "@/lib/briefing/format-weekly";
import { deriveKeySignal } from "@/lib/briefing/key-signal";
import { intelligenceGeneratedByProvider } from "@/lib/intelligence/provider";
import { extractJsonPayload } from "@/lib/intelligence/provider/extract-json";
import {
  extractTaggedSections,
  pickTaggedSection,
  splitProseBlocks,
} from "@/lib/intelligence/provider/extract-tags";
import type { WeeklyBriefingMode } from "@/lib/briefing/weekly-engine";
import type { WeeklyBriefing } from "@/lib/briefing/weekly-engine";
import type { OnboardingProfile, Story } from "@/lib/types";

const BRIEFING_FILLER =
  /\b(coverage is developing|dominant theme|worth tracking|through-line|this weekly|landscape shifted)\b/i;

const HEADLINE_ALIASES = ["HEADLINE", "TITLE", "THESIS"];
const SUMMARY_ALIASES = ["SUMMARY", "BRIEFING", "WEEKLY_BRIEFING", "SYNTHESIS"];
const SIGNAL_ALIASES = [
  "KEY_SIGNAL",
  "KEYSIGNAL",
  "EDITORS_NOTE",
  "SIGNAL",
  "BOTTOM_LINE",
];

function isFiller(text: string): boolean {
  return BRIEFING_FILLER.test(text);
}

function parseFromJson(
  content: string,
  mode: WeeklyBriefingMode,
  selected: Story[],
  weekLabel: string,
  profile: OnboardingProfile | null
): WeeklyBriefing | null {
  try {
    const jsonText = extractJsonPayload(content);
    const parsed = JSON.parse(jsonText) as {
      headline?: string;
      summary?: string;
      keySignal?: string;
      editorsNote?: string;
    };

    const headline = parsed.headline?.trim() ?? "";
    const summary = parsed.summary?.trim() ?? "";
    if (!headline && !summary) return null;

    return finalizeBriefing({
      mode,
      weekLabel,
      headline,
      summary,
      keySignal:
        parsed.keySignal?.trim() ||
        parsed.editorsNote?.trim() ||
        deriveKeySignal(selected),
      selected,
      profile,
    });
  } catch {
    return null;
  }
}

function finalizeBriefing(input: {
  mode: WeeklyBriefingMode;
  weekLabel: string;
  headline: string;
  summary: string;
  keySignal: string;
  selected: Story[];
  profile?: OnboardingProfile | null;
}): WeeklyBriefing | null {
  let headline = input.headline.trim();
  let summary = input.summary.trim();
  let keySignal = input.keySignal.trim();

  if (!headline && summary) {
    const firstSentence = summary.match(/^[^.!?]+[.!?]/)?.[0]?.trim();
    headline = firstSentence ?? summary;
  }

  const fallbackTitle = deriveFallbackHeadline(
    input.selected,
    input.mode,
    input.profile ?? null
  );

  if (isListLikeHeadline(headline)) {
    headline = fallbackTitle;
  }

  headline = normalizeWeeklyHeadline(headline, input.mode, fallbackTitle);

  if (!summary && headline) {
    summary = headline;
  }

  summary = normalizeWeeklySummary(summary);

  if (!keySignal || keySignal.length < 12) {
    keySignal = deriveKeySignal(input.selected);
  }
  keySignal = normalizeKeySignal(keySignal);

  if (!headline || headline.length < 8) return null;
  if (!summary || summary.length < 60) {
    return null;
  }

  if (isFiller(`${headline} ${summary}`)) return null;
  if (isFiller(keySignal)) {
    keySignal = normalizeKeySignal(deriveKeySignal(input.selected));
  }

  return {
    mode: input.mode,
    weekLabel: input.weekLabel,
    headline,
    summary,
    keySignal,
    generatedBy: intelligenceGeneratedByProvider(),
  };
}

function parseFromTags(
  content: string,
  mode: WeeklyBriefingMode,
  selected: Story[],
  weekLabel: string,
  profile: OnboardingProfile | null
): WeeklyBriefing | null {
  const sections = extractTaggedSections(content);

  let headline = pickTaggedSection(sections, HEADLINE_ALIASES) ?? "";
  let summary = pickTaggedSection(sections, SUMMARY_ALIASES) ?? "";
  let keySignal = pickTaggedSection(sections, SIGNAL_ALIASES) ?? "";

  if (!headline && !summary) {
    const blocks = splitProseBlocks(content, 48);
    if (blocks.length >= 2) {
      headline = blocks[0];
      summary = blocks.slice(1).join("\n\n");
    } else if (blocks.length === 1) {
      summary = blocks[0];
    }
  }

  if (!keySignal) {
    keySignal = deriveKeySignal(selected);
  }

  return finalizeBriefing({
    mode,
    weekLabel,
    headline,
    summary,
    keySignal,
    selected,
    profile,
  });
}

export function parseWeeklyBriefingResponse(
  content: string,
  mode: WeeklyBriefingMode,
  selected: Story[],
  weekLabel: string,
  profile: OnboardingProfile | null = null
): WeeklyBriefing | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const fromTags = parseFromTags(trimmed, mode, selected, weekLabel, profile);
  if (fromTags) return fromTags;

  return parseFromJson(trimmed, mode, selected, weekLabel, profile);
}
