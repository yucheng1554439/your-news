import type { OnboardingProfile } from "@/lib/types";
import { defaultProfile } from "@/lib/onboarding";

export const ONBOARDING_METADATA_KEY = "onboarding";

export type ClerkPublicMetadata = {
  [ONBOARDING_METADATA_KEY]?: OnboardingProfile;
};

export function parseOnboardingFromMetadata(
  metadata: ClerkPublicMetadata | Record<string, unknown> | undefined | null
): OnboardingProfile | null {
  const raw = (metadata as ClerkPublicMetadata)?.[ONBOARDING_METADATA_KEY];
  if (!raw || typeof raw !== "object") return null;

  return {
    ...defaultProfile,
    interests: Array.isArray(raw.interests) ? raw.interests : [],
    career: raw.career ?? null,
    focusType: raw.focusType ?? null,
    tone: raw.tone ?? null,
    completed: Boolean(raw.completed),
    updatedAt:
      typeof raw.updatedAt === "number" ? raw.updatedAt : undefined,
  };
}

export function isProfileComplete(profile: OnboardingProfile): boolean {
  return profile.completed;
}
