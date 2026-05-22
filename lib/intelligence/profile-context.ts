import { createHash } from "crypto";
import type { OnboardingProfile } from "@/lib/types";

const INTEREST_LABELS: Record<string, string> = {
  ai: "AI",
  markets: "markets",
  energy: "energy",
  geopolitics: "geopolitics",
  cybersecurity: "cybersecurity",
  startups: "startups",
  policy: "policy",
  developer: "developer tools",
  technology: "technology",
};

const CAREER_NARRATIVE: Record<
  NonNullable<OnboardingProfile["career"]>,
  string
> = {
  engineer:
    "They build and ship software; they care about architecture, reliability, AI tooling, and technical risk.",
  investor:
    "They allocate capital; they care about macro signal, valuations, policy, and asymmetric upside.",
  founder:
    "They run a company; they care about markets, competition, regulation, and narrative risk.",
  executive:
    "They lead organizations; they care about policy, geopolitics, markets, and operational exposure.",
  researcher:
    "They synthesize evidence; they care about methodology, policy intersections, and frontier science.",
};

const FOCUS_GUIDANCE: Record<
  NonNullable<OnboardingProfile["focusType"]>,
  string
> = {
  breadth: "Prioritize how this fits a wide scan — is it signal or noise?",
  depth: "Prioritize whether this rewards a deep read vs. a headline scan.",
  breaking: "Prioritize urgency — should this interrupt their day?",
};

const TONE_GUIDANCE: Record<NonNullable<OnboardingProfile["tone"]>, string> = {
  analytical: "Write with precision. No flourish.",
  concise: "Minimal words. High signal per sentence.",
  narrative: "Slightly more flow, still restrained.",
};

export function hashProfile(profile: OnboardingProfile | null): string {
  if (!profile) return "anonymous";
  const payload = JSON.stringify({
    interests: [...profile.interests].sort(),
    career: profile.career,
    focusType: profile.focusType,
    tone: profile.tone,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export function buildReaderContext(profile: OnboardingProfile): string {
  const interests =
    profile.interests.length > 0
      ? profile.interests.map((i) => INTEREST_LABELS[i] ?? i).join(", ")
      : "general world affairs";

  const career = profile.career
    ? `${profile.career} — ${CAREER_NARRATIVE[profile.career]}`
    : "role not specified";

  const focus = profile.focusType
    ? FOCUS_GUIDANCE[profile.focusType]
    : "Standard briefing cadence.";

  const tone = profile.tone
    ? TONE_GUIDANCE[profile.tone]
    : "Analytical default.";

  return `READER PROFILE (personalization must visibly reflect this — different careers must get clearly different "whyItMattersToYou" text):
- Career lens: ${career}
- Primary interests: ${interests}
- Focus: ${focus}
- Tone: ${tone}`;
}

export function hasPersonalizationProfile(
  profile: OnboardingProfile | null
): profile is OnboardingProfile {
  return Boolean(
    profile?.completed &&
      profile.interests.length > 0 &&
      profile.career
  );
}
