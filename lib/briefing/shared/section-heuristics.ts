import { isGenericBriefingSection } from "@/lib/briefing/shared/impact-fallback";

const MIN_GLOBAL_SECTION_CHARS = 150;

const COMPANY_FRAGMENT =
  /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b(?:\s+(?:said|announced|reported|shares|stock|IPO|earnings))/g;

const ARTICLE_SUMMARY =
  /\b(according to|sources say|report says|reported that|said in a statement)\b/i;

function countDistinctCompanies(text: string): number {
  const matches = text.match(COMPANY_FRAGMENT) ?? [];
  const names = new Set(
    matches.map((m) =>
      m.replace(/\s+(said|announced|reported|shares|stock|IPO|earnings).*$/i, "").trim()
    )
  );
  return names.size;
}

function looksLikeSingleCompanySummary(text: string): boolean {
  const companies = countDistinctCompanies(text);
  if (companies <= 1 && text.length < 320) {
    const hasMultiNarrative =
      /\b(theme|themes|clusters?|threads?|parallel|across|several|multiple|pattern|landscape)\b/i.test(
        text
      );
    return !hasMultiNarrative;
  }
  return false;
}

function looksLikeSingleArticleSummary(text: string): boolean {
  if (text.length < 200) return false;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 12);
  if (sentences.length <= 2 && ARTICLE_SUMMARY.test(text)) return true;
  const hasThemes = /\bTheme \d+:/i.test(text);
  const hasMulti =
    /\b(clusters?|threads?|themes?|parallel|across several)\b/i.test(text);
  return !hasThemes && !hasMulti && sentences.length <= 2 && text.length < 400;
}

function hasDuplicatedNarrativeLabels(text: string): boolean {
  const labels = [...text.matchAll(/Theme \d+:\s*([^\n]+)/gi)].map((m) =>
    m[1]!.trim().toLowerCase()
  );
  if (labels.length < 2) return false;
  return new Set(labels).size < labels.length;
}

export function globalBriefingSectionIsWeak(text: string | undefined): boolean {
  const t = text?.trim() ?? "";
  if (!t || t.length < MIN_GLOBAL_SECTION_CHARS) return true;
  if (isGenericBriefingSection(t)) return true;
  if (looksLikeSingleCompanySummary(t)) return true;
  if (looksLikeSingleArticleSummary(t)) return true;
  if (hasDuplicatedNarrativeLabels(t)) return true;
  return false;
}

export {
  looksLikeSingleCompanySummary,
  looksLikeSingleArticleSummary,
  hasDuplicatedNarrativeLabels,
  MIN_GLOBAL_SECTION_CHARS,
};
