import { extractEntities, type NarrativeTheme } from "@/lib/editorial/narrative-clusters";
import {
  type NarrativeThread,
  type WeeklyBriefingSelection,
} from "@/lib/briefing/weekly-selection";
import {
  hasDuplicatedHeadlinePhrase,
  isArticleLikeHeadline,
} from "@/lib/briefing/thesis-title";

const FOR_YOU_TITLE_MAX = 88;

function trimForYouHeadline(raw: string): string {
  let h = raw.replace(/\s+/g, " ").trim();
  if (h.length <= FOR_YOU_TITLE_MAX) return h;
  const slice = h.slice(0, FOR_YOU_TITLE_MAX);
  const sp = slice.lastIndexOf(" ");
  return (sp > 24 ? slice.slice(0, sp) : slice).trim();
}

export const ENTITY_DISPLAY: Record<string, string> = {
  nvidia: "Nvidia",
  openai: "OpenAI",
  anthropic: "Anthropic",
  microsoft: "Microsoft",
  google: "Google",
  apple: "Apple",
  amazon: "Amazon",
  meta: "Meta",
  tsmc: "TSMC",
  fed: "the Fed",
  china: "China",
  ukraine: "Ukraine",
  opec: "OPEC",
};

/** Thesis-style headline fragments — not week-agnostic boilerplate. */
export const THEME_HEADLINE_PHRASE: Record<NarrativeTheme, string> = {
  "nvidia-semis": "Semiconductor And AI Chip Demand",
  "ai-capex": "AI Infrastructure Spending",
  "hyperscaler-cloud": "Hyperscaler Capex And Cloud Build-Out",
  "fed-rates": "Rates And Liquidity",
  "geopolitics-conflict": "Geopolitical Risk",
  "energy-commodities": "Energy Markets And Supply Shock",
  "big-tech-ai": "Frontier AI Competition",
  "cyber-breach": "Cyber And Systemic Tech Risk",
  "policy-regulation": "Export Controls And Regulation",
  "banking-financial": "Banking And Credit Stress",
  "humanitarian-social": "Humanitarian And Social Pressure",
  general: "Cross-Market Developments",
};

const FORBIDDEN_TITLE =
  /\b(a strategic pattern|several priorities|several signals|important developments|multiple themes converged|several portfolio|several build|several operating|several strategic|several gtm|capital is rotating|build and hire|operating risks are|one material change in the last day|gTM and funding pressures|new claims need)\b/i;

const DEBUG_METADATA =
  /\[[^\]]{2,80}\]\s*\(\s*\d+\s*(?:stories|articles)|\(\s*\d+\s*(?:stories|articles),\s*\d+\s*sources?\)|theme\s+\d+:\s*|\d+-story corpus/i;

export type ForYouCorpusSignals = {
  entities: string[];
  entityDisplay: string[];
  themePhrases: string[];
  threadLabels: string[];
  rankedThreads: NarrativeThread[];
};

export function humanizeClusterLabel(label: string): string {
  return label
    .replace(/^\[|\]$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isForbiddenGenericForYouTitle(headline: string): boolean {
  const h = headline.trim();
  if (!h || h.length < 12) return true;
  if (FORBIDDEN_TITLE.test(h)) return true;
  if (/^several\s/i.test(h) && /\b(this week|converged|emerged)\b/i.test(h)) {
    return true;
  }
  return false;
}

export function hasLeakedIntelligenceDebug(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return DEBUG_METADATA.test(t);
}

function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
}

function themePhraseForThread(thread: NarrativeThread): string {
  const fromTheme = THEME_HEADLINE_PHRASE[thread.theme];
  if (thread.theme !== "general") return fromTheme;
  const label = humanizeClusterLabel(thread.label);
  if (label.length >= 8 && label.length <= 48) {
    return label
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }
  return fromTheme;
}

export function collectForYouCorpusSignals(
  selection: WeeklyBriefingSelection
): ForYouCorpusSignals {
  const ranked = [...selection.threads].sort(
    (a, b) => b.personalScore - a.personalScore
  );
  const entityIds = new Set<string>();
  for (const thread of ranked.slice(0, 5)) {
    for (const story of thread.stories.slice(0, 8)) {
      for (const id of extractEntities(story)) entityIds.add(id);
    }
  }
  const entities = [...entityIds];
  const entityDisplay = entities.map((id) => ENTITY_DISPLAY[id] ?? id);
  const themePhrases = uniqueStrings(
    ranked.slice(0, 4).map((t) => themePhraseForThread(t))
  );
  const threadLabels = uniqueStrings(
    ranked.slice(0, 4).map((t) => humanizeClusterLabel(t.label))
  );

  return {
    entities,
    entityDisplay,
    themePhrases,
    threadLabels,
    rankedThreads: ranked,
  };
}

/** Raw thematic headline from corpus — normalize via `deriveThematicForYouHeadline` in format-weekly. */
export function buildThematicForYouHeadline(
  selection: WeeklyBriefingSelection
): string {
  const signals = collectForYouCorpusSignals(selection);
  const phrases = signals.themePhrases.filter(
    (p) => p && !isForbiddenGenericForYouTitle(p)
  );

  if (phrases.length >= 2) {
    const combined = `${phrases[0]} Meets ${phrases[1]}`;
    const normalized = trimForYouHeadline(combined);
    if (
      !isForbiddenGenericForYouTitle(normalized) &&
      !hasDuplicatedHeadlinePhrase(normalized)
    ) {
      return normalized;
    }
  }

  if (phrases.length === 1 && signals.threadLabels.length >= 2) {
    const combined = `${phrases[0]} And ${signals.threadLabels[1]}`;
    const normalized = trimForYouHeadline(combined);
    if (
      !isForbiddenGenericForYouTitle(normalized) &&
      !hasDuplicatedHeadlinePhrase(normalized)
    ) {
      return normalized;
    }
  }

  if (phrases.length === 1) {
    const normalized = trimForYouHeadline(phrases[0]);
    if (!isForbiddenGenericForYouTitle(normalized)) return normalized;
  }

  const lead = signals.rankedThreads[0];
  if (lead) {
    const fromLead = themePhraseForThread(lead);
    const normalized = trimForYouHeadline(fromLead);
    if (
      !isForbiddenGenericForYouTitle(normalized) &&
      !isArticleLikeHeadline(normalized)
    ) {
      return normalized;
    }
  }

  if (signals.entityDisplay.length >= 2) {
    const combined = `${signals.entityDisplay[0]} And ${signals.entityDisplay[1]} In Focus`;
    return trimForYouHeadline(combined);
  }

  return trimForYouHeadline(THEME_HEADLINE_PHRASE["ai-capex"]);
}

const CORPUS_REFERENCE =
  /\b(nvidia|openai|anthropic|microsoft|google|amazon|meta|apple|tsmc|fed|federal reserve|opec|cpi|pce|export.?control|earnings|guidance|capex|sanction|iran|israel|ukraine|taiwan|china|treasury|sec\b|ftc|hyperscaler|semiconductor|inflation|rate cut|data center|gpu)\b/i;

export function textReferencesCorpus(
  text: string,
  signals: ForYouCorpusSignals
): boolean {
  const t = text.trim();
  if (!t) return false;
  if (hasLeakedIntelligenceDebug(t)) return false;

  for (const name of signals.entityDisplay) {
    if (name.length >= 3 && t.toLowerCase().includes(name.toLowerCase())) {
      return true;
    }
  }
  for (const label of signals.threadLabels) {
    const token = label.split(/\s+/)[0];
    if (token && token.length >= 4 && t.toLowerCase().includes(token.toLowerCase())) {
      return true;
    }
  }
  for (const phrase of signals.themePhrases) {
    const token = phrase.split(/\s+/).slice(0, 2).join(" ");
    if (token.length >= 5 && t.toLowerCase().includes(token.toLowerCase())) {
      return true;
    }
  }
  return CORPUS_REFERENCE.test(t);
}
