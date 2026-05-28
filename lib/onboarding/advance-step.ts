"use client";

import type { OnboardingProfile } from "@/lib/types";
import { saveOnboardingProfileAsync } from "@/lib/onboarding";

export type PersistOnboardingResult =
  | { ok: true; profile: OnboardingProfile }
  | { ok: false; error: string };

/** Saves to localStorage and Clerk; surfaces Clerk failures. */
export async function persistOnboardingStep(
  userId: string,
  partial: Partial<OnboardingProfile>
): Promise<PersistOnboardingResult> {
  try {
    const profile = await saveOnboardingProfileAsync(partial, userId);
    return { ok: true, profile };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not save preferences";
    return { ok: false, error: message };
  }
}
