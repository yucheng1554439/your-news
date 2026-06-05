import type {
  IntelligenceBriefing,
  OnboardingProfile,
  UserIntelligenceProfile,
} from "@/types";
import { FOR_YOU_NO_ACTION } from "@/lib/for-you-section-coherence";

const GENERIC_ACTION_PATTERNS = [
  /evaluate vendor(?:\s+and\s+infrastructure)? commitments/i,
  /review exposure(?:\s+and\s+position sizing)?/i,
  /review portfolio exposure/i,
  /monitor developments?/i,
  /tier-1 corroboration/i,
  /align hiring and build-vs-buy/i,
  /stay informed/i,
  /stress-test capacity plans/i,
  /defer irreversible architecture bets until tier-1/i,
  /^monitor whether/i,
  /^watch for\s/i,
  /^watch whether\s/i,
  /^monitor\s/i,
];

export type BriefingActionContext = {
  profile: OnboardingProfile | null;
  userIntelligence: UserIntelligenceProfile | null;
};

export function isGenericActionText(text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 12) return true;
  if (/^no immediate action required/i.test(t)) return false;
  return GENERIC_ACTION_PATTERNS.some((re) => re.test(t));
}

function corpusEntities(briefing: IntelligenceBriefing): string[] {
  const blob = [
    briefing.headline,
    briefing.whatChanged,
    briefing.whyYou,
    ...(briefing.watchItems ?? []),
  ]
    .filter(Boolean)
    .join(" ");
  const found = new Set<string>();
  for (const m of blob.matchAll(
    /\b(nvidia|broadcom|openai|microsoft|google|amazon|meta|apple|tsmc|fed|opec)\b/gi
  )) {
    if (m[0]) found.add(m[0].charAt(0).toUpperCase() + m[0].slice(1).toLowerCase());
  }
  return [...found];
}

function derivePersonalizedAction(
  briefing: IntelligenceBriefing,
  ctx: BriefingActionContext
): string {
  const headline = briefing.headline?.trim() ?? "the lead narrative thread";
  const focus =
    [
      ...(ctx.profile?.interests ?? []),
      ...(ctx.userIntelligence?.primaryThemes?.map((t) => t.label) ?? []),
    ]
      .filter(Boolean)
      .slice(0, 4)
      .join(", ") || "your stated priorities";
  const entities = corpusEntities(briefing);
  const lead = entities[0] ?? headline.split(/\s+/)[0];
  const second = entities[1] ?? "adjacent themes";
  const h = headline.toLowerCase();
  const career = ctx.profile?.career;

  if (
    career === "engineer" &&
    /\bnvidia\b/.test(h) &&
    /\b(strong|surge|record|demand)\b/.test(h) &&
    /\bbroadcom\b/.test(h) &&
    /\b(miss|weak|disappoint|forecast)\b/.test(h)
  ) {
    return `If Nvidia demand remains strong while Broadcom weakens, avoid assuming AI capex benefits every semiconductor supplier equally. Revisit architecture and vendor plans against ${focus} before locking infrastructure spend.`;
  }

  const byCareer: Record<string, string> = {
    engineer: `Given ${headline}, pause long-term GPU and data-center commitments with ${lead} until export-control rules clarify — then revisit architecture choices against ${focus}.`,
    investor: `Given ${headline}, resize exposure to ${lead} before its next earnings or guidance; if ${second} moves opposite, treat that as dispersion — not broad AI beta.`,
    founder: `Given ${headline}, tighten one GTM or burn milestone before scaling spend — customer budgets may be reacting to ${lead}, not sector averages.`,
    executive: `Given ${headline}, prepare board options on vendor concentration with ${lead} and assign owners to validate procurement exposure within two weeks.`,
    researcher: `Given ${headline}, queue primary-source verification on claims involving ${lead} before citing them externally.`,
  };

  if (career && byCareer[career]) return byCareer[career];

  return `Given ${headline}, revisit budget and vendor timing tied to ${lead} against ${focus} before committing capital.`;
}

export function resolveBriefingAction(
  briefing: IntelligenceBriefing,
  ctx: BriefingActionContext
): { body: string; isNoAction: boolean; isPersonalized: boolean } {
  const raw = (briefing.positioning ?? briefing.decisions ?? "").trim();

  if (raw && !isGenericActionText(raw)) {
    return { body: raw, isNoAction: false, isPersonalized: false };
  }

  const personalized = derivePersonalizedAction(briefing, ctx);
  if (personalized && !isGenericActionText(personalized)) {
    return { body: personalized, isNoAction: false, isPersonalized: true };
  }

  return {
    body: FOR_YOU_NO_ACTION,
    isNoAction: true,
    isPersonalized: true,
  };
}
