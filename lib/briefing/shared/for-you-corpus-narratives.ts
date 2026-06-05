import { extractEntities } from "@/lib/editorial/narrative-clusters";
import type { NarrativeTheme } from "@/lib/editorial/narrative-clusters";
import {
  collectForYouCorpusSignals,
  ENTITY_DISPLAY,
  humanizeClusterLabel,
} from "@/lib/briefing/shared/for-you-corpus-signals";
import type {
  NarrativeThread,
  WeeklyBriefingSelection,
} from "@/lib/briefing/weekly-selection";
import type { OnboardingProfile } from "@/lib/types";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
export const GENERIC_FOR_YOU_WATCH =
  /\b(tier-1 follow-up|follow-up reporting|monitor developments|stay informed|watch for the next\s+(?:markets?|geopolitics?|technology|business|world)\s+development|confirms or reverses the (?:lead|current) narrative)\b/i;

export const GENERIC_FOR_YOU_ACTION =
  /\b(evaluate vendor(?:\s+and\s+infrastructure)? commitments|review exposure(?:\s+and\s+position sizing)?|review portfolio exposure|monitor developments|stay informed|align hiring and build-vs-buy|tier-1 corroboration|stress-test capacity plans against|defer irreversible architecture bets until tier-1)\b/i;

const WEAK_SIGNAL =
  /\b(miss|missed|weak|weaker|disappoint|cut|lower|slump|warning|downgrade|below expectations)\b/i;
const STRONG_SIGNAL =
  /\b(strong|surge|record|beat|raise|raised|demand|accelerat|dominance|outperform)\b/i;

function threadBlob(thread: NarrativeThread): string {
  return thread.stories
    .map((s) => `${s.headline} ${s.summary ?? ""}`)
    .join(" ")
    .toLowerCase();
}

function displayEntity(id: string): string {
  return ENTITY_DISPLAY[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

function entitiesForThread(thread: NarrativeThread): string[] {
  const ids = new Set<string>();
  for (const story of thread.stories.slice(0, 12)) {
    for (const id of extractEntities(story)) ids.add(id);
  }
  const blob = threadBlob(thread);
  if (/\bbroadcom\b/.test(blob)) ids.add("broadcom");
  if (/\bcomputex\b/.test(blob)) ids.add("computex");
  return [...ids].map(displayEntity);
}

function leadHeadline(thread: NarrativeThread): string {
  const story = thread.stories[0];
  if (!story?.headline?.trim()) {
    return `${humanizeClusterLabel(thread.label)} is the lead thread in your corpus.`;
  }
  const h = story.headline.trim();
  return h.endsWith(".") ? h : `${h}.`;
}

function broadcomWatchCatalyst(blob: string): string | null {
  if (!/\bbroadcom\b/.test(blob)) return null;
  if (WEAK_SIGNAL.test(blob)) {
    return "the next Broadcom guidance revision to determine whether the weakness is Broadcom-specific or sector-wide";
  }
  return "Broadcom AI revenue revisions, hyperscaler procurement signals, and the next earnings guidance print";
}

function nvidiaWatchCatalyst(blob: string): string | null {
  if (!/\bnvidia\b/.test(blob)) return null;
  if (/\bblackwell\b/.test(blob)) {
    return "Nvidia Blackwell shipment guidance, foundry allocation, and export-control filings on advanced GPUs";
  }
  return "Nvidia earnings guidance, data-center GPU supply, and export-control announcements";
}

function watchCatalystForThread(thread: NarrativeThread): string {
  const blob = threadBlob(thread);
  const entities = entitiesForThread(thread);
  const topic = humanizeClusterLabel(thread.label);

  const broadcom = broadcomWatchCatalyst(blob);
  if (broadcom) return broadcom;

  const nvidia = nvidiaWatchCatalyst(blob);
  if (nvidia) return nvidia;

  if (/\bcomputex\b/.test(blob)) {
    return "Computex product launches from AMD, Intel, and Nvidia, plus Taiwan supply-chain and export-control headlines";
  }

  const byTheme: Partial<Record<NarrativeTheme, string>> = {
    "fed-rates": `CPI/PCE prints, Fed minutes, and whether ${entities[0] ?? "major banks"} reprice rate-sensitive holdings`,
    "ai-capex": `${entities.find((e) => /microsoft|amazon|google|meta/i.test(e)) ?? "Hyperscaler"} capex guidance and AI data-center procurement filings`,
    "nvidia-semis": `${entities.find((e) => /nvidia|tsmc|amd/i.test(e)) ?? "Nvidia"} earnings, HBM allocation, and semiconductor export-control rules`,
    "geopolitics-conflict": `official sanctions and energy corridor updates involving ${topic.split(/\s+/)[0] ?? "the region"}`,
    "policy-regulation": "SEC/FTC enforcement steps and U.S. or EU export-control rule changes on advanced chips",
    "energy-commodities": "OPEC+ decisions and EIA inventory prints that move power and data-center costs",
    "banking-financial": `${entities[0] ?? "Regional bank"} earnings and U.S. liquidity or Basel rule changes`,
    "hyperscaler-cloud": `${entities.find((e) => /microsoft|amazon|google|meta/i.test(e)) ?? "Hyperscaler"} cloud revenue and AI capex plans`,
    "big-tech-ai": `${entities.find((e) => /openai|anthropic|google|microsoft/i.test(e)) ?? "Frontier AI"} product launches and enterprise adoption metrics`,
  };

  const themed = byTheme[thread.theme];
  if (themed) return themed;

  const lead = entities[0] ?? topic;
  return `${lead} earnings, guidance, product launches, or policy filings that confirm or reverse this thread`;
}

export function deriveCorpusWatchItem(thread: NarrativeThread): string {
  const fact = leadHeadline(thread);
  const catalyst = watchCatalystForThread(thread);
  return `${fact}\n\nWatch ${catalyst}.`;
}

export function deriveCorpusForYouWatchText(
  selection: WeeklyBriefingSelection
): string {
  const signals = collectForYouCorpusSignals(selection);
  return signals.rankedThreads
    .slice(0, 4)
    .map((t) => deriveCorpusWatchItem(t))
    .join("\n\n");
}

export function isGenericForYouWatch(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (GENERIC_FOR_YOU_WATCH.test(t)) return true;
  if (
    /^watch\s+(for\s+)?(tier-1|follow-up|the next)/i.test(t) &&
    !/\b(nvidia|broadcom|cpi|fed|opec|earnings|guidance|export|blackwell|computex)\b/i.test(t)
  ) {
    return true;
  }
  return false;
}

export function isGenericForYouAction(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (/^no immediate action required/i.test(t)) return false;
  return GENERIC_FOR_YOU_ACTION.test(t);
}

type SemisContrast = { strong: string; weak: string };

function detectSemiconductorContrast(
  threads: NarrativeThread[]
): SemisContrast | null {
  let strong: string | null = null;
  let weak: string | null = null;

  for (const thread of threads.slice(0, 6)) {
    const blob = threadBlob(thread);
    if (/\bnvidia\b/.test(blob) && STRONG_SIGNAL.test(blob)) strong = "Nvidia";
    if (/\bbroadcom\b/.test(blob) && WEAK_SIGNAL.test(blob)) weak = "Broadcom";
    if (/\bamd\b/.test(blob) && WEAK_SIGNAL.test(blob) && !weak) weak = "AMD";
    if (/\bintel\b/.test(blob) && WEAK_SIGNAL.test(blob) && !weak) weak = "Intel";
  }

  if (strong && weak) return { strong, weak };
  return null;
}

function collectFocus(
  profile: OnboardingProfile | null,
  intelligence?: UserIntelligenceProfile | null
): string[] {
  const out: string[] = [];
  if (profile?.interests?.length) out.push(...profile.interests);
  for (const t of intelligence?.primaryThemes ?? []) {
    if (t.label) out.push(t.label);
  }
  for (const id of profile?.topicPreferences?.moreOf ?? []) {
    out.push(id.replace(/-/g, " "));
  }
  return [...new Set(out.map((s) => s.trim()).filter(Boolean))].slice(0, 5);
}

function leadFactSentence(thread: NarrativeThread | undefined): string {
  if (!thread) return "the lead storyline in your corpus";
  return leadHeadline(thread).replace(/\.$/, "");
}

export function deriveCorpusForYouActionText(
  profile: OnboardingProfile | null,
  intelligence: UserIntelligenceProfile | null | undefined,
  selection: WeeklyBriefingSelection
): string {
  const signals = collectForYouCorpusSignals(selection);
  const ranked = signals.rankedThreads;
  const lead = ranked[0];
  const second = ranked[1];
  const focus = collectFocus(profile, intelligence);
  const focusPhrase =
    focus.length > 0 ? focus.join(", ") : "your stated priorities";
  const entities = signals.entityDisplay;
  const entityA = entities[0] ?? humanizeClusterLabel(lead?.label ?? "the lead thread");
  const entityB = entities[1] ?? humanizeClusterLabel(second?.label ?? "adjacent themes");
  const contrast = detectSemiconductorContrast(ranked);
  const leadFact = leadFactSentence(lead);
  const savedHint =
    intelligence?.savedSlugs && intelligence.savedSlugs.length > 0
      ? " Cross-check stories you have saved before changing commitments."
      : "";

  const career = profile?.career;

  if (contrast && career === "engineer") {
    return `Coverage highlights ${leadFact}. If ${contrast.strong} demand remains strong while ${contrast.weak} weakens, the market may be rewarding platform dominance rather than broad AI spend growth. If you are evaluating infrastructure vendors, avoid assuming AI capex benefits every semiconductor supplier equally — map GPU and data-center plans against ${focusPhrase}.${savedHint}`;
  }

  if (contrast && career === "investor") {
    return `${leadFact}. If ${contrast.strong} holds up while ${contrast.weak} guides lower, rebalance semiconductor exposure rather than treating AI as a single trade. Size positions around ${entityA} and ${entityB} before the next earnings and macro prints.${savedHint}`;
  }

  const exportTopic =
    lead?.theme === "policy-regulation" ||
    lead?.theme === "geopolitics-conflict" ||
    lead?.theme === "nvidia-semis";

  const byCareer: Record<NonNullable<OnboardingProfile["career"]>, string> = {
    engineer: exportTopic
      ? `Given ${leadFact}, pause long-term GPU and data-center vendor contracts with ${entityA} until export-control rules clarify. Revisit architecture and build-vs-buy plans against ${focusPhrase} — do not treat ${entityB} momentum as sector-wide strength.${savedHint}`
      : `Given ${leadFact}, revisit which infrastructure vendors actually benefit from this week's signals before changing architecture or hiring plans tied to ${focusPhrase}.${savedHint}`,
    investor: `Given ${leadFact}, resize exposure to ${entityA} before its next earnings or guidance cycle. If ${entityB} moves the opposite way, treat that as a dispersion trade — not a reason to add broad AI beta.${savedHint}`,
    founder: `Given ${leadFact}, tighten one GTM or burn milestone before scaling spend — customer budgets may be reacting to ${entityA} headlines, not sector averages. Adjust fundraising narrative if ${entityB} weakens pipeline assumptions.${savedHint}`,
    executive: `Given ${leadFact}, prepare board options on vendor concentration with ${entityA} and assign owners to validate ${exportTopic ? "export-control compliance" : "procurement exposure"} within two weeks.${savedHint}`,
    researcher: `Given ${leadFact}, queue primary-source verification on claims involving ${entityA} before publishing; flag whether ${entityB} corroborates or contradicts the lead thesis.${savedHint}`,
  };

  if (career && byCareer[career]) return byCareer[career];

  return `Given ${leadFact}, revisit budget and vendor timing tied to ${entityA} against ${focusPhrase} before committing capital.${savedHint}`;
}
