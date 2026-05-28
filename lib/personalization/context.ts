import type { OnboardingProfile } from "@/lib/types";
import type { PersonalizationSignals } from "@/lib/personalization/signals";

const CAREER_LABEL: Record<NonNullable<OnboardingProfile["career"]>, string> = {
  engineer: "software engineer",
  investor: "investor",
  founder: "founder",
  executive: "executive",
  researcher: "researcher",
};

/** How to reason about personalized consequences — not output templates. */
const CAREER_CONSEQUENCE_FRAME: Record<
  NonNullable<OnboardingProfile["career"]>,
  string
> = {
  investor:
    "Reason about: portfolio exposure, sector winners/losers, earnings or rate sensitivity, liquidity, repositioning timing.",
  engineer:
    "Reason about: hiring, stack/vendor choices, reliability, build-vs-buy, roadmap priority, competitive tooling.",
  founder:
    "Reason about: fundraising narrative, GTM timing, burn, pricing power, competitive response, customer procurement.",
  executive:
    "Reason about: revenue at risk, ops/compliance exposure, board-level decisions, partner and supply-chain impact.",
  researcher:
    "Reason about: evidence quality, funding/policy knock-ons, what claim is proven vs asserted, what data to pull next.",
};

export function buildReaderNote(profile: OnboardingProfile): string {
  const career = profile.career ? CAREER_LABEL[profile.career] : "reader";
  const interests =
    profile.interests.length > 0 ? profile.interests.join(", ") : "general news";
  const focus = profile.focusType ?? "balanced";
  const tone = profile.tone ?? "analytical";
  const consequenceFrame = profile.career
    ? CAREER_CONSEQUENCE_FRAME[profile.career]
    : "";

  return `Reader: ${career}. Cares about: ${interests}. Focus: ${focus}. Tone: ${tone}.
${consequenceFrame}`;
}

export const buildIntelligenceBrief = buildReaderNote;

export function canPersonalize(signals: PersonalizationSignals): boolean {
  const { profile } = signals;
  return profile.interests.length > 0 && Boolean(profile.career);
}
