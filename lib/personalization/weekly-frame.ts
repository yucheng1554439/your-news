import type { BriefingCadence, BriefingMode } from "@/lib/briefing/types";
import type { OnboardingProfile } from "@/lib/types";

const CAREER_WEEKLY_QUESTION: Record<
  NonNullable<OnboardingProfile["career"]>,
  string
> = {
  investor: "Which developments matter for my capital, rates, sectors, and valuations?",
  engineer:
    "Which developments matter for hiring, infrastructure, enterprise software, and tooling?",
  founder:
    "Which developments matter for fundraising, customers, GTM, and AI competition?",
  executive:
    "Which developments matter for revenue, ops, partners, and board-level risk?",
  researcher: "Which claims or datasets moved — and what must I verify?",
};

const CAREER_FOCUS: Record<
  NonNullable<OnboardingProfile["career"]>,
  string
> = {
  investor:
    "Capital exposure, rate sensitivity, sector rotation, valuation pressure, liquidity.",
  engineer:
    "Hiring, stack/vendor choices, reliability, roadmap priority, competitive tooling.",
  founder:
    "Fundraising climate, customer spend, burn, GTM timing, competitive response.",
  executive:
    "Revenue at risk, compliance, supply chain, partner impact.",
  researcher:
    "Evidence quality, funding/policy knock-ons, what to verify next.",
};

const FOCUS_HINT: Record<NonNullable<OnboardingProfile["focusType"]>, string> =
  {
    breadth: "Cover distinct threads — do not collapse everything into one theme.",
    depth: "Prioritize the deepest corroborated thread, but still mention other personal priorities briefly.",
    breaking: "Lead with what moved most recently and is still developing.",
  };

const TONE_HINT: Record<NonNullable<OnboardingProfile["tone"]>, string> = {
  analytical: "Precise, mechanism-focused sentences.",
  concise: "Minimal words; no filler.",
  narrative: "Short connective phrasing only when it aids clarity — still factual.",
};

export function buildReaderProfileBlock(
  profile: OnboardingProfile | null
): string {
  if (!profile) {
    return "Reader profile: not fully onboarded — weight stated interests only.";
  }
  if (!profile.completed && !profile.career) {
    return "Reader profile: interests-led (no career set).";
  }

  const career = profile.career ?? "general reader";
  const interests =
    profile.interests.length > 0 ? profile.interests.join(", ") : "broad news";
  const focus = profile.focusType
    ? FOCUS_HINT[profile.focusType]
    : "Balance breadth across personal priorities.";
  const tone = profile.tone
    ? TONE_HINT[profile.tone]
    : "Clear and neutral.";

  const frame = profile.career
    ? CAREER_FOCUS[profile.career]
    : "Practical decisions and attention priority.";

  return `READER PROFILE (use all dimensions together):
- Career: ${career}
- Interests: ${interests}
- Decision frame: ${frame}
- Focus preference: ${focus}
- Tone: ${tone}`;
}

export function buildWeeklyModeFrame(
  mode: BriefingMode,
  profile: OnboardingProfile | null,
  cadence: BriefingCadence = "weekly"
): string {
  const period = cadence === "daily" ? "today" : "this week";

  if (mode === "global") {
    return `GLOBAL lens — answer: "What happened in the world ${period}?"
- One dominant world narrative only.
- Institutions, regions, industries — not personal portfolio or career advice.`;
  }

  const profileBlock = buildReaderProfileBlock(profile);
  const question = profile?.career
    ? CAREER_WEEKLY_QUESTION[profile.career]
    : "Which developments matter most for this reader's decisions?";

  return `FOR YOU lens — answer: "${question.replace("this week", period)}"
${profileBlock}
- MULTI-NARRATIVE synthesis: weave every thread below that matters to this reader.
- For each thread: why it matters to them, decisions influenced, what to monitor, what would invalidate.
- Not a filtered global summary or headline recap.`;
}
