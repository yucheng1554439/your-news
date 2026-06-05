import type {
  IntelligenceBriefing,
  OnboardingProfile,
  UserIntelligenceProfile,
} from "@/types";
import type { BriefingDisplaySection } from "@/lib/briefing-display";
import {
  deriveImpactFallbackFromBriefing,
  isGenericBriefingSection,
  isNoDirectImpactText,
} from "@/lib/briefing-impact-fallback";

export const FOR_YOU_NO_ACTION =
  "No immediate action required. Continue monitoring the developments above.";

const MIN_OVERVIEW = 150;
const MIN_IMPACT = 100;
const MIN_WATCH = 100;
const MIN_ACTION = 100;

const TOXIC_WATCH =
  /confirm relevance|confirm relevance for you|^monitor:\s|^monitor\s+confirm/i;

const GENERIC_HEADLINE =
  /\b(a strategic pattern|several priorities|several signals|important developments|multiple themes|several portfolio|several build|several operating|capital is rotating|build and hire|operating risks are)/i;

const DEBUG_METADATA =
  /\[[^\]]{2,80}\]\s*\(\s*\d+\s*(?:stories|articles)|\(\s*\d+\s*(?:stories|articles),\s*\d+\s*sources?\)|theme\s+\d+:/i;

const CORPUS_ENTITY =
  /\b(nvidia|openai|anthropic|microsoft|google|amazon|meta|apple|tsmc|fed|federal reserve|opec|cpi|pce|export.?control|earnings|guidance|capex|sanction|iran|israel|ukraine|taiwan|china|treasury|sec\b|ftc|hyperscaler|semiconductor|inflation|rate cut|data center|gpu)\b/i;

function hasLeakedDebug(text: string): boolean {
  return DEBUG_METADATA.test(text.trim());
}

function corpusEntitiesFromBriefing(briefing: IntelligenceBriefing): string[] {
  const blob = [
    briefing.headline,
    briefing.whatChanged,
    briefing.whyYou,
    ...(briefing.watchItems ?? []),
  ]
    .filter(Boolean)
    .join(" ");
  const found = new Set<string>();
  for (const m of blob.matchAll(CORPUS_ENTITY)) {
    if (m[0]) found.add(m[0]);
  }
  return [...found].slice(0, 4);
}

function textHasCorpusEntity(text: string, entities: string[]): boolean {
  if (hasLeakedDebug(text)) return false;
  const lower = text.toLowerCase();
  if (entities.some((e) => lower.includes(e.toLowerCase()))) return true;
  return CORPUS_ENTITY.test(text);
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string): number {
  const stop = new Set([
    "the",
    "a",
    "an",
    "for",
    "you",
    "your",
    "this",
    "that",
    "and",
    "or",
    "to",
    "of",
    "in",
    "on",
    "is",
    "are",
    "with",
    "from",
    "as",
    "at",
    "by",
    "it",
    "may",
    "would",
    "could",
    "should",
  ]);
  const ta = new Set(
    normalize(a)
      .split(" ")
      .filter((w) => w.length > 2 && !stop.has(w))
  );
  const tb = new Set(
    normalize(b)
      .split(" ")
      .filter((w) => w.length > 2 && !stop.has(w))
  );
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  return union ? inter / union : 0;
}

function tooSimilar(a: string, b: string, threshold = 0.7): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  return similarity(a, b) >= threshold;
}

function isWatchLanguage(text: string): boolean {
  return /^(monitor|confirm relevance|watch for|watch whether|maintain awareness)\b/i.test(
    text.trim()
  );
}

function isToxicWatch(text: string): boolean {
  const t = text.trim();
  return !t || TOXIC_WATCH.test(t);
}

function actionRepeatsWatch(action: string, watch: string): boolean {
  const a = action.trim().toLowerCase();
  const w = watch.trim().toLowerCase();
  if (!a || !w) return false;
  if (a.includes(w) || w.includes(a)) return true;
  const lead = w.slice(0, 40);
  return lead.length > 16 && a.includes(lead);
}

function extractThreadLabel(briefing: IntelligenceBriefing): string {
  for (const item of briefing.watchItems ?? []) {
    const t = item.trim();
    const m = t.match(/confirm relevance(?:\s+for you)?:\s*(.+)/i);
    if (m?.[1]) return m[1].replace(/\.$/, "").slice(0, 80);
  }
  const headline = briefing.headline?.trim();
  if (headline && !GENERIC_HEADLINE.test(headline) && !isWatchLanguage(headline)) {
    return headline.slice(0, 80);
  }
  const lead = briefing.whatChanged?.split(/[.!?]/)[0]?.trim();
  if (lead && lead.length > 20 && !GENERIC_HEADLINE.test(lead)) {
    return lead.slice(0, 80);
  }
  return "the lead narrative thread";
}

function themeLabels(
  profile: OnboardingProfile | null,
  userIntelligence: UserIntelligenceProfile | null
): string[] {
  const labels: string[] = [];
  for (const t of userIntelligence?.primaryThemes ?? []) {
    if (t.label) labels.push(t.label);
  }
  for (const id of profile?.topicPreferences?.moreOf ?? []) {
    labels.push(id.replace(/-/g, " "));
  }
  if (profile?.interests?.length) labels.push(...profile.interests);
  if (profile?.career) labels.push(profile.career);
  return labels.slice(0, 5);
}

function deriveOverviewBody(briefing: IntelligenceBriefing): string {
  const raw = briefing.whatChanged?.trim() ?? briefing.summary?.trim() ?? "";
  const headline = briefing.headline?.trim() ?? "";

  if (
    raw.length >= MIN_OVERVIEW &&
    !isGenericBriefingSection(raw) &&
    !tooSimilar(raw, headline) &&
    !GENERIC_HEADLINE.test(raw)
  ) {
    return raw;
  }

  const label = extractThreadLabel(briefing);
  return `What happened: reporting converged on ${label} as the lead thread this period, with corroboration across multiple outlets shaping the narrative. Parallel coverage on adjacent themes also moved; the Impact section explains how this connects to your career focus and topic preferences. Weight tier-1 follow-up before treating any single headline as decisive.`;
}

const GENERIC_WATCH =
  /\b(tier-1 follow-up|follow-up reporting|evaluate vendor|review exposure|monitor developments)\b/i;

function deriveWatchBody(briefing: IntelligenceBriefing): string {
  const headline = briefing.headline?.trim() ?? extractThreadLabel(briefing);
  const fact = headline.endsWith(".") ? headline : `${headline}.`;
  const entities = corpusEntitiesFromBriefing(briefing);
  const h = headline.toLowerCase();

  let catalyst: string;
  if (/\bbroadcom\b/.test(h) && /\b(miss|weak|disappoint|forecast|cut|lower)\b/.test(h)) {
    catalyst =
      "the next Broadcom guidance revision to determine whether the weakness is Broadcom-specific or sector-wide";
  } else if (/\bbroadcom\b/.test(h)) {
    catalyst =
      "Broadcom AI revenue revisions, hyperscaler procurement signals, and the next earnings guidance print";
  } else if (/\bnvidia\b/.test(h) && /\bblackwell\b/.test(h)) {
    catalyst =
      "Nvidia Blackwell shipment guidance, foundry allocation, and export-control filings on advanced GPUs";
  } else if (/\bnvidia\b/.test(h)) {
    catalyst =
      "Nvidia earnings guidance, data-center GPU supply, and export-control announcements";
  } else if (/\bcomputex\b/.test(h)) {
    catalyst =
      "Computex product launches from AMD, Intel, and Nvidia, plus Taiwan supply-chain headlines";
  } else if (entities.length > 0) {
    catalyst = `${entities.slice(0, 2).join(" and ")} earnings, guidance, product launches, and policy filings`;
  } else {
    catalyst = `${extractThreadLabel(briefing)} earnings, guidance, and official policy steps`;
  }

  return `${fact}\n\nWatch ${catalyst}.`;
}

function deriveActionBody(
  briefing: IntelligenceBriefing,
  profile: OnboardingProfile | null,
  userIntelligence: UserIntelligenceProfile | null
): string {
  const label = extractThreadLabel(briefing);
  const focus = themeLabels(profile, userIntelligence).join(", ") || "your priorities";
  const career = profile?.career;

  const entities = corpusEntitiesFromBriefing(briefing);
  const chipLead = entities.find((e) => /nvidia|tsmc|amd|broadcom/i.test(e)) ?? entities[0];
  const secondEntity = entities.find((e) => e !== chipLead) ?? "adjacent themes";

  const headline = briefing.headline?.trim() ?? label;
  const h = headline.toLowerCase();
  const hasNvidiaStrong = /\bnvidia\b/.test(h) && /\b(strong|surge|record|demand|beat)\b/.test(h);
  const hasBroadcomWeak =
    /\bbroadcom\b/.test(h) && /\b(miss|weak|disappoint|forecast|cut|lower)\b/.test(h);

  const byCareer: Record<string, string> = {
    engineer:
      hasNvidiaStrong && hasBroadcomWeak
        ? `If Nvidia demand remains strong while Broadcom weakens, avoid assuming AI capex benefits every semiconductor supplier equally. Revisit architecture and vendor plans against ${focus} before locking infrastructure spend.`
        : chipLead
          ? `Given ${headline}, pause long-term GPU and data-center contracts with ${chipLead} until export-control rules clarify — then revisit architecture choices against ${focus}.`
          : `Given ${headline}, revisit which infrastructure vendors actually benefit from this week's signals before changing architecture or hiring tied to ${focus}.`,
    investor: `Given ${headline}, resize exposure to ${chipLead ?? "the lead name"} before its next earnings or guidance; if ${secondEntity} moves opposite, treat that as dispersion — not broad AI beta.`,
    founder: `Revisit GTM sequencing and burn assumptions tied to ${label}; adjust fundraising narrative if customer budgets shift. Prioritize one milestone that validates demand before scaling spend.`,
    executive: `Map operating and partner dependencies exposed by ${label}; prepare board-ready options on budget and vendor concentration. Assign owners to validate procurement exposure within two weeks.`,
    researcher: `Audit primary-source quality behind ${label}; queue verification before citing conclusions externally.`,
  };

  if (career && byCareer[career]) return byCareer[career];
  return `Revisit budget, vendor, and timing assumptions for ${label} against ${focus}. Decide what to defer until corroboration strengthens.`;
}

function deriveImpactBody(
  briefing: IntelligenceBriefing,
  profile: OnboardingProfile | null,
  userIntelligence: UserIntelligenceProfile | null
): string {
  const raw = briefing.whyYou?.trim();
  if (
    raw &&
    !isNoDirectImpactText(raw) &&
    !isGenericBriefingSection(raw) &&
    !hasLeakedDebug(raw) &&
    raw.length >= MIN_IMPACT
  ) {
    return raw;
  }
  return deriveImpactFallbackFromBriefing(
    briefing,
    profile,
    userIntelligence
  );
}

function validateSections(sections: {
  overview: string;
  impact: string;
  watch: string;
  action: string;
}): string[] {
  const reasons: string[] = [];
  if (sections.overview.length < MIN_OVERVIEW) reasons.push("overview short");
  if (sections.impact.length < MIN_IMPACT) reasons.push("impact short");
  if (sections.watch.length < MIN_WATCH) reasons.push("watch short");
  if (
    sections.action.length < MIN_ACTION &&
    !/^no immediate action required/i.test(sections.action)
  ) {
    reasons.push("action short");
  }
  if (tooSimilar(sections.overview, sections.impact)) reasons.push("overview~impact");
  if (tooSimilar(sections.impact, sections.watch)) reasons.push("impact~watch");
  if (tooSimilar(sections.watch, sections.action)) reasons.push("watch~action");
  if (tooSimilar(sections.impact, sections.action)) reasons.push("impact~action");
  if (isToxicWatch(sections.watch)) reasons.push("toxic watch");
  if (hasLeakedDebug(sections.impact) || hasLeakedDebug(sections.watch)) {
    reasons.push("debug metadata");
  }
  if (isWatchLanguage(sections.action)) reasons.push("action watch-language");
  if (actionRepeatsWatch(sections.action, sections.watch)) {
    reasons.push("action repeats watch");
  }
  return reasons;
}

function validateCorpusQuality(
  sections: { watch: string; action: string },
  briefing: IntelligenceBriefing
): string[] {
  const reasons: string[] = [];
  const entities = corpusEntitiesFromBriefing(briefing);
  if (!textHasCorpusEntity(sections.watch, entities)) {
    reasons.push("watch lacks entity");
  }
  if (
    !/^no immediate action required/i.test(sections.action) &&
    !textHasCorpusEntity(sections.action, entities)
  ) {
    reasons.push("action lacks entity");
  }
  return reasons;
}

/** Ensure four distinct For You sections before render. */
export function coerceDistinctForYouSections(
  sections: BriefingDisplaySection[],
  briefing: IntelligenceBriefing,
  profile: OnboardingProfile | null,
  userIntelligence: UserIntelligenceProfile | null
): BriefingDisplaySection[] {
  const out = sections.map((s) => ({ ...s }));
  const overviewI = out.findIndex((s) => s.key === "what-changed");
  const impactI = out.findIndex((s) => s.key === "why-you");
  const watchI = out.findIndex((s) => s.key === "what-to-watch");
  const actionI = out.findIndex((s) => s.key === "action");
  if (overviewI < 0 || impactI < 0 || watchI < 0 || actionI < 0) return out;

  let overview = deriveOverviewBody(briefing);
  let impact = deriveImpactBody(briefing, profile, userIntelligence);
  let watch = deriveWatchBody(briefing);
  let action = deriveActionBody(briefing, profile, userIntelligence);

  for (let pass = 0; pass < 4; pass++) {
    const reasons = [
      ...validateSections({ overview, impact, watch, action }),
      ...validateCorpusQuality({ watch, action }, briefing),
    ];
    if (reasons.length === 0) break;

    if (reasons.some((r) => r.startsWith("overview"))) {
      overview = deriveOverviewBody(briefing);
    }
    if (
      reasons.some((r) => r.startsWith("impact")) ||
      reasons.some((r) => r.includes("debug")) ||
      tooSimilar(overview, impact)
    ) {
      impact = deriveImpactBody(briefing, profile, userIntelligence);
    }
    if (
      reasons.some((r) => r.includes("watch")) ||
      reasons.some((r) => r.includes("entity")) ||
      tooSimilar(impact, watch) ||
      isToxicWatch(watch) ||
      GENERIC_WATCH.test(watch) ||
      hasLeakedDebug(watch)
    ) {
      watch = deriveWatchBody(briefing);
    }
    if (
      reasons.some((r) => r.startsWith("action")) ||
      isWatchLanguage(action) ||
      actionRepeatsWatch(action, watch) ||
      tooSimilar(watch, action)
    ) {
      action = deriveActionBody(briefing, profile, userIntelligence);
      if (tooSimilar(watch, action) || actionRepeatsWatch(action, watch)) {
        action = FOR_YOU_NO_ACTION;
      }
    }
  }

  out[overviewI] = { ...out[overviewI]!, body: overview, isFallback: true };
  out[impactI] = {
    ...out[impactI]!,
    body: impact,
    isFallback: !briefing.whyYou?.trim(),
    highlight: true,
  };
  out[watchI] = { ...out[watchI]!, body: watch, isFallback: true };
  out[actionI] = {
    ...out[actionI]!,
    body: action,
    isFallback: /^no immediate action required/i.test(action),
    highlight: !/^no immediate action required/i.test(action),
  };

  const reasons = validateSections({ overview, impact, watch, action });
  if (reasons.length > 0) {
    console.warn(
      "[BRIEFING_SECTION_WARNING]",
      JSON.stringify({ mode: "for-you", client: true, reasons })
    );
  }

  return out;
}
