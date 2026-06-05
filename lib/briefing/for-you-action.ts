import "server-only";

import { FOR_YOU_NO_ACTION, isValidForYouAction } from "@/lib/briefing/shared/for-you-sections";
import { deriveCorpusForYouActionText } from "@/lib/briefing/shared/for-you-corpus-narratives";
import type { WeeklyBriefingSelection } from "@/lib/briefing/weekly-selection";
import type { OnboardingProfile } from "@/lib/types";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";

export function deriveForYouWeeklyActionText(
  profile: OnboardingProfile | null,
  intelligence: UserIntelligenceProfile | null | undefined,
  selection: WeeklyBriefingSelection
): string {
  return deriveCorpusForYouActionText(profile, intelligence, selection);
}

export function resolveForYouActionFromBriefing(
  raw: string | undefined,
  profile: OnboardingProfile | null,
  intelligence: UserIntelligenceProfile | null | undefined,
  selection: WeeklyBriefingSelection
): string {
  const trimmed = raw?.trim() ?? "";
  if (trimmed && isValidForYouAction(trimmed)) return trimmed;
  const derived = deriveForYouWeeklyActionText(profile, intelligence, selection);
  return isValidForYouAction(derived) ? derived : FOR_YOU_NO_ACTION;
}
