import type { OnboardingProfile } from "@/lib/types";
import type { BriefingMode } from "@/lib/briefing/types";

const CAREER_ADVISOR: Record<
  NonNullable<OnboardingProfile["career"]>,
  string
> = {
  investor:
    "Portfolio exposure, valuation risk, sector rotation, liquidity, rate sensitivity.",
  engineer:
    "Hiring, infrastructure demand, enterprise software spend, tooling and vendor choices.",
  founder:
    "Fundraising climate, customer budgets, GTM pressure, competitive dynamics, AI adoption.",
  executive:
    "Revenue at risk, ops and compliance exposure, partners, board-level decisions.",
  researcher:
    "Evidence quality, funding and policy knock-ons, claims to verify.",
};

/** For You briefings: decision-support, not news recap. */
export const PERSONAL_ADVISOR_MANDATE = `Personal advisor mandate (For You only):
You are a strategic advisor and decision-support analyst — NOT a news summarizer.
For each thread that matters to this reader, address:
1. Why does this matter to THIS user (career + interests)?
2. What decisions could this influence (concrete, role-specific)?
3. What should they monitor next (specific signal or date)?
4. What could invalidate this read (what evidence would change the call)?
Use facts from sources; label inference with may/could.`;

export function buildCareerAdvisorLens(
  profile: OnboardingProfile | null
): string {
  if (!profile?.career) {
    return "Decision lens: practical priorities from stated interests.";
  }
  return `Decision lens (${profile.career}): ${CAREER_ADVISOR[profile.career]}`;
}

export function advisorTagsForMode(mode: BriefingMode): string {
  if (mode === "global") {
    return `<KEY_SIGNAL>
One short line: the world's top fact or watch item
</KEY_SIGNAL>`;
  }

  return `<DECISIONS>
1–2 sentences: decisions this reader may need to make or revisit (role-specific)
</DECISIONS>

<MONITOR>
1 sentence: the single best signal or event to watch next
</MONITOR>

<INVALIDATE>
1 sentence: what evidence would invalidate this briefing's read
</INVALIDATE>

<KEY_SIGNAL>
Repeat the top monitor line only (short)
</KEY_SIGNAL>`;
}
