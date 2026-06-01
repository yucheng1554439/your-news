import type { BriefingCadence } from "@/lib/briefing/types";
import type { OnboardingProfile } from "@/lib/types";

type StyleBlock = { focus: string; tone: string; cadence: string };

function focusInstructions(
  focus: NonNullable<OnboardingProfile["focusType"]>,
  cadence: BriefingCadence
): string {
  const horizon =
    cadence === "daily"
      ? "last 24–48 hours only"
      : "the full week";

  const map: Record<NonNullable<OnboardingProfile["focusType"]>, string> = {
    breaking: `FOCUS=Breaking: Lead with what changed in ${horizon}. Short time horizon. Name what is still in motion. Deprioritize background context.`,
    depth: `FOCUS=Depth: Emphasize mechanisms and longer-run implications within ${horizon}. Still concise — one layer deeper than headlines.`,
    breadth: `FOCUS=Breadth: Cover distinct threads; do not collapse unrelated lanes. Balance across the reader's interests.`,
  };
  return map[focus];
}

function toneInstructions(tone: NonNullable<OnboardingProfile["tone"]>): string {
  const map: Record<NonNullable<OnboardingProfile["tone"]>, string> = {
    analytical:
      "TONE=Analytical: Evidence-first. Name mechanisms. Separate fact vs inference explicitly.",
    concise:
      "TONE=Concise: Minimal words. No connective fluff. Every sentence earns its place.",
    narrative:
      "TONE=Narrative: Brief cause→effect flow in plain English — still factual, not dramatic.",
  };
  return map[tone];
}

/**
 * Profile dimensions that must materially change briefing output.
 */
export function buildProfileStyleBlock(
  profile: OnboardingProfile | null,
  cadence: BriefingCadence
): string {
  if (!profile) {
    return cadence === "daily"
      ? "Style: neutral daily scan; facts first."
      : "Style: neutral weekly scan; facts first.";
  }

  const parts: string[] = [];
  if (profile.focusType) {
    parts.push(focusInstructions(profile.focusType, cadence));
  }
  if (profile.tone) {
    parts.push(toneInstructions(profile.tone));
  }
  if (profile.interests.length > 0) {
    parts.push(
      `INTERESTS (weight heavily): ${profile.interests.join(", ")}`
    );
  }
  if (profile.career) {
    parts.push(`CAREER (decision frame): ${profile.career}`);
  }

  if (parts.length === 0) {
    return "Style: clear, neutral, practical.";
  }

  return `PROFILE STYLE (all dimensions mandatory):\n${parts.join("\n")}`;
}
