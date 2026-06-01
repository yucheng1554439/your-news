import type { BriefingCadence, BriefingMode } from "@/lib/briefing/types";

/** Headlines that read like publication titles, not intelligence theses. */
const ARTICLE_LIKE =
  /\b(revives|memories|according to|sources say|report says|exclusive:|breaking:|update:|says|said|announces|unveils)\b/i;

const ELLIPSIS = /(\.\.\.|…)/;

const COMPANY_EVENT =
  /^(?:[A-Z][a-z]+\s+){0,3}(?:IPO|Shares|Stock|Earnings|Profit|Loss)\b/;

const QUOTED_FRAGMENT = /[''""]/;

export function isArticleLikeHeadline(headline: string): boolean {
  const h = headline.trim();
  if (!h || h.length < 10) return true;
  if (ELLIPSIS.test(h)) return true;
  if (ARTICLE_LIKE.test(h)) return true;
  if (COMPANY_EVENT.test(h)) return true;
  if (QUOTED_FRAGMENT.test(h) && h.length > 40) return true;
  if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4}'s\b/.test(h)) return true;
  return false;
}

const THESIS_VERBS =
  /\b(is|are|shifts|shifted|pushes|tests|faces|risks|tightens|accelerates|signals|positions|prioritizes|redirects|concentrates)\b/i;

export function lacksThesisVoice(headline: string): boolean {
  const h = headline.trim();
  if (THESIS_VERBS.test(h)) return false;
  if (/\b(strategy|pressure|shift|tool|lane|push|bet|play)\b/i.test(h)) return false;
  return true;
}

export function normalizeThesisHeadline(
  raw: string,
  mode: BriefingMode,
  cadence: BriefingCadence,
  fallback?: string
): string {
  let headline = raw.replace(/\s+/g, " ").trim();
  headline = headline.replace(ELLIPSIS, "").replace(/[''""]+/g, "");

  if (isArticleLikeHeadline(headline) || lacksThesisVoice(headline)) {
    if (fallback && !isArticleLikeHeadline(fallback)) {
      headline = fallback;
    }
  }

  if (headline.length > 92) {
    const slice = headline.slice(0, 92);
    const sp = slice.lastIndexOf(" ");
    headline = sp > 30 ? slice.slice(0, sp) : slice;
  }

  return headline;
}

export const THESIS_TITLE_RULES = `HEADLINE (intelligence thesis — NOT an article title):
- State the CONCLUSION or strategic pattern — never the news event headline.
- Thesis voice: "X Is Y", "Y Is Becoming Z", "Capital Is Shifting Toward…"
- BANNED: company name + IPO/event, ellipsis (…), "revives", "memories", "says", "reports", quoted fragments.
- 6–12 words, title case, max 92 characters.
- Good: "Liquidity Is Becoming a Strategic Tool in China's Tech Push"
- Bad: "China Chip Giant CXMT's IPO Revives Memories"`;

export const DAILY_THESIS_EXTRA = `DAILY headline = thesis about what changed in the LAST 24 HOURS (one event), not the weekly pattern.`;

export const WEEKLY_THESIS_EXTRA = `WEEKLY headline = thesis about the WEEKLY PATTERN (strategic arc), NOT today's single event or any article headline. Name the pattern, not the IPO.`;
