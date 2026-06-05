import { sectionsTooSimilar } from "@/lib/briefing/shared/section-similarity";
import type { IntelligenceBriefing } from "@/lib/briefing/types";

export const FOR_YOU_NO_ACTION =
  "No immediate action required. Continue monitoring the developments above.";

export const FOR_YOU_MIN_LENGTHS = {
  overview: 150,
  impact: 100,
  watch: 100,
  action: 100,
} as const;

const TOXIC_WATCH =
  /confirm relevance|confirm relevance for you|^monitor:\s|^monitor\s+confirm|^watch for\s+confirm/i;

import {
  isGenericForYouAction,
  isGenericForYouWatch,
} from "@/lib/briefing/shared/for-you-corpus-narratives";
import {
  hasLeakedIntelligenceDebug,
  isForbiddenGenericForYouTitle,
  textReferencesCorpus,
  type ForYouCorpusSignals,
} from "@/lib/briefing/shared/for-you-corpus-signals";

const WATCH_LANGUAGE =
  /^(monitor|confirm relevance|watch for|watch whether|maintain awareness)\b/i;

export function isToxicWatchText(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (TOXIC_WATCH.test(t)) return true;
  return isGenericForYouWatch(t);
}

export function isWatchLanguage(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (/^no immediate action required/i.test(t)) return false;
  return WATCH_LANGUAGE.test(t);
}

export function isGenericForYouHeadline(headline: string): boolean {
  return isForbiddenGenericForYouTitle(headline);
}

export function forYouSectionNeedsCorpusQuality(
  sections: ForYouDisplaySections,
  signals: ForYouCorpusSignals,
  headline?: string
): string[] {
  const reasons: string[] = [];
  if (headline && isForbiddenGenericForYouTitle(headline)) {
    reasons.push("generic headline");
  }
  if (hasLeakedIntelligenceDebug(sections.impact)) {
    reasons.push("impact leaks debug metadata");
  }
  if (hasLeakedIntelligenceDebug(sections.watch)) {
    reasons.push("watch leaks debug metadata");
  }
  if (isGenericForYouWatch(sections.watch)) {
    reasons.push("generic watch");
  }
  if (
    !/^no immediate action required/i.test(sections.action) &&
    isGenericForYouAction(sections.action)
  ) {
    reasons.push("generic action");
  }
  if (!textReferencesCorpus(sections.watch, signals)) {
    reasons.push("watch lacks corpus entity");
  }
  if (
    !/^no immediate action required/i.test(sections.action) &&
    !textReferencesCorpus(sections.action, signals)
  ) {
    reasons.push("action lacks corpus entity");
  }
  return reasons;
}

/** Prefer a concrete thread label from watch items over generic career headlines. */
export function extractLeadThreadLabel(briefing: IntelligenceBriefing): string {
  for (const item of briefing.watchItems ?? []) {
    const t = item.trim();
    const colon = t.match(/confirm relevance(?:\s+for you)?:\s*(.+)/i);
    if (colon?.[1]) return colon[1].replace(/\.$/, "").slice(0, 80);
    const monitor = t.match(/^monitor:\s*(.+)/i);
    if (monitor?.[1]) return monitor[1].replace(/\.$/, "").slice(0, 80);
  }

  const headline = briefing.headline?.trim();
  if (headline && !isGenericForYouHeadline(headline) && !isWatchLanguage(headline)) {
    return headline.slice(0, 80);
  }

  const lead = briefing.whatChanged?.split(/[.!?]/)[0]?.trim();
  if (lead && lead.length > 24 && !isGenericForYouHeadline(lead)) {
    return lead.slice(0, 80);
  }

  return "the lead narrative thread";
}

export function actionRepeatsWatch(action: string, watch: string): boolean {
  const a = action.trim().toLowerCase();
  const w = watch.trim().toLowerCase();
  if (!a || !w) return false;
  if (a.includes(w) || w.includes(a)) return true;
  const wLead = w.slice(0, 48);
  if (wLead.length > 20 && a.includes(wLead)) return true;
  return sectionsTooSimilar(action, watch);
}

export type ForYouDisplaySections = {
  overview: string;
  impact: string;
  watch: string;
  action: string;
};

export type ForYouSectionValidation = {
  ok: boolean;
  reasons: string[];
};

export function validateForYouDisplaySections(
  sections: ForYouDisplaySections,
  briefing: IntelligenceBriefing
): ForYouSectionValidation {
  const reasons: string[] = [];
  const { overview, impact, watch, action } = sections;
  const headline = briefing.headline?.trim() ?? "";

  if (overview.length < FOR_YOU_MIN_LENGTHS.overview) {
    reasons.push(`overview too short (${overview.length})`);
  }
  if (impact.length < FOR_YOU_MIN_LENGTHS.impact) {
    reasons.push(`impact too short (${impact.length})`);
  }
  if (watch.length < FOR_YOU_MIN_LENGTHS.watch) {
    reasons.push(`watch too short (${watch.length})`);
  }
  if (
    action.length < FOR_YOU_MIN_LENGTHS.action &&
    !/^no immediate action required/i.test(action)
  ) {
    reasons.push(`action too short (${action.length})`);
  }

  if (headline && sectionsTooSimilar(overview, headline)) {
    reasons.push("overview duplicates headline");
  }
  if (sectionsTooSimilar(overview, impact)) reasons.push("overview~impact");
  if (sectionsTooSimilar(impact, watch)) reasons.push("impact~watch");
  if (sectionsTooSimilar(watch, action)) reasons.push("watch~action");
  if (sectionsTooSimilar(impact, action)) reasons.push("impact~action");

  if (isToxicWatchText(watch) || watch.split(/\n\n/).some(isToxicWatchText)) {
    reasons.push("toxic watch");
  }
  if (isWatchLanguage(action) && !/^no immediate action required/i.test(action)) {
    reasons.push("action is watch language");
  }
  if (actionRepeatsWatch(action, watch)) {
    reasons.push("action repeats watch");
  }

  return { ok: reasons.length === 0, reasons };
}
