import { sectionsTooSimilar } from "@/lib/briefing/shared/section-similarity";
import { deriveThematicForYouHeadline } from "@/lib/briefing/format-weekly";
import {
  collectForYouCorpusSignals,
  hasLeakedIntelligenceDebug,
  isForbiddenGenericForYouTitle,
} from "@/lib/briefing/shared/for-you-corpus-signals";
import type { WeeklyBriefingSelection } from "@/lib/briefing/weekly-selection";
import {
  isGenericForYouAction,
  isGenericForYouWatch,
} from "@/lib/briefing/shared/for-you-corpus-narratives";
import {
  actionRepeatsWatch,
  forYouSectionNeedsCorpusQuality,
  FOR_YOU_NO_ACTION,
  FOR_YOU_MIN_LENGTHS,
  isGenericForYouHeadline,
  isToxicWatchText,
  isWatchLanguage,
} from "@/lib/briefing/shared/for-you-section-coherence";
import type { IntelligenceBriefing } from "@/lib/briefing/types";

export { FOR_YOU_NO_ACTION } from "@/lib/briefing/shared/for-you-section-coherence";
export {
  isToxicWatchText,
  isWatchLanguage,
} from "@/lib/briefing/shared/for-you-section-coherence";

export function isValidForYouAction(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/^no immediate action required/i.test(t)) return true;
  if (t.length < FOR_YOU_MIN_LENGTHS.action) return false;
  if (isWatchLanguage(t)) return false;
  if (isGenericForYouAction(t)) return false;
  const actionVerbs =
    /\b(evaluate|revisit|prepare|assess|adjust|rebalance|prioritize|audit|defer|accelerate|trim|expand|avoid|pause|resize|tighten|map|queue)\b/i;
  return actionVerbs.test(t);
}

export type ForYouSectionSet = {
  overview: string;
  impact: string;
  watch: string;
  action: string;
};

export type ForYouSectionValidation = {
  ok: boolean;
  reasons: string[];
};

/** True when cached or model output reused the same phrase across sections. */
export function briefingNeedsSectionRepair(
  briefing: IntelligenceBriefing,
  selection?: WeeklyBriefingSelection
): boolean {
  if (briefing.mode !== "for-you") return false;

  const overview =
    briefing.whatChanged?.trim() ?? briefing.summary?.trim() ?? "";
  const impact = briefing.whyYou?.trim() ?? "";
  const watch = (briefing.watchItems ?? []).join("\n\n").trim();
  const action = (briefing.positioning ?? briefing.decisions ?? "").trim();
  const headline = briefing.headline?.trim() ?? "";

  if (headline && isForbiddenGenericForYouTitle(headline)) return true;
  if (hasLeakedIntelligenceDebug(impact) || hasLeakedIntelligenceDebug(watch)) {
    return true;
  }

  if (
    watch &&
    (isToxicWatchText(watch) ||
      isGenericForYouWatch(watch) ||
      watch.split(/\n\n/).some(isToxicWatchText))
  ) {
    return true;
  }
  if (action && isGenericForYouAction(action)) return true;
  if (action && isWatchLanguage(action)) return true;
  if (action && watch && actionRepeatsWatch(action, watch)) return true;
  if (overview.length < FOR_YOU_MIN_LENGTHS.overview) return true;
  if (impact.length < FOR_YOU_MIN_LENGTHS.impact) return true;
  if (watch.length < FOR_YOU_MIN_LENGTHS.watch) return true;
  if (
    action.length < FOR_YOU_MIN_LENGTHS.action &&
    !/^no immediate action required/i.test(action)
  ) {
    return true;
  }
  if (headline && sectionsTooSimilar(overview, headline)) return true;
  if (isGenericForYouHeadline(overview) && overview.length < 200) return true;

  const pairs: [string, string][] = [
    [overview, impact],
    [overview, watch],
    [impact, watch],
    [watch, action],
    [impact, action],
  ];
  for (const [a, b] of pairs) {
    if (a && b && sectionsTooSimilar(a, b)) return true;
  }

  return false;
}

export function validateForYouSections(
  sections: ForYouSectionSet,
  selection?: WeeklyBriefingSelection,
  headline?: string
): ForYouSectionValidation {
  const reasons: string[] = [];

  if (sections.overview.trim().length < FOR_YOU_MIN_LENGTHS.overview) {
    reasons.push(
      `overview too short (${sections.overview.length} < ${FOR_YOU_MIN_LENGTHS.overview})`
    );
  }
  if (sections.impact.trim().length < FOR_YOU_MIN_LENGTHS.impact) {
    reasons.push(
      `impact too short (${sections.impact.length} < ${FOR_YOU_MIN_LENGTHS.impact})`
    );
  }
  if (sections.watch.trim().length < FOR_YOU_MIN_LENGTHS.watch) {
    reasons.push(
      `watch too short (${sections.watch.length} < ${FOR_YOU_MIN_LENGTHS.watch})`
    );
  }
  if (
    sections.action.trim().length < FOR_YOU_MIN_LENGTHS.action &&
    !/^no immediate action required/i.test(sections.action)
  ) {
    reasons.push(
      `action too short (${sections.action.length} < ${FOR_YOU_MIN_LENGTHS.action})`
    );
  }

  const pairs: [string, string, string, string][] = [
    ["overview", "impact", sections.overview, sections.impact],
    ["overview", "watch", sections.overview, sections.watch],
    ["overview", "action", sections.overview, sections.action],
    ["impact", "watch", sections.impact, sections.watch],
    ["impact", "action", sections.impact, sections.action],
    ["watch", "action", sections.watch, sections.action],
  ];

  for (const [nameA, nameB, textA, textB] of pairs) {
    if (sectionsTooSimilar(textA, textB)) {
      reasons.push(`${nameA} and ${nameB} are too similar`);
    }
  }

  if (
    isWatchLanguage(sections.action) &&
    !/^no immediate action/i.test(sections.action)
  ) {
    reasons.push("action contains watch/monitor language");
  }
  if (isToxicWatchText(sections.watch)) {
    reasons.push("toxic watch phrasing");
  }
  if (actionRepeatsWatch(sections.action, sections.watch)) {
    reasons.push("action repeats watch");
  }

  if (selection) {
    const signals = collectForYouCorpusSignals(selection);
    reasons.push(
      ...forYouSectionNeedsCorpusQuality(sections, signals, headline)
    );
  }

  return { ok: reasons.length === 0, reasons };
}

export function resolveForYouHeadline(
  briefing: IntelligenceBriefing,
  selection: WeeklyBriefingSelection
): string {
  const raw = briefing.headline?.trim() ?? "";
  if (raw && !isForbiddenGenericForYouTitle(raw)) return raw;
  return deriveThematicForYouHeadline(selection);
}

export function logForYouSectionValidation(
  sections: ForYouSectionSet,
  validation: ForYouSectionValidation
): void {
  if (validation.ok) return;
  console.warn(
    "[BRIEFING_SECTION_WARNING]",
    JSON.stringify({
      mode: "for-you",
      reasons: validation.reasons,
      lengths: {
        overview: sections.overview.length,
        impact: sections.impact.length,
        watch: sections.watch.length,
        action: sections.action.length,
      },
    })
  );
}
