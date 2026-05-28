import { createHash } from "crypto";
import { buildReaderNote, canPersonalize } from "@/lib/personalization/context";
import type { OnboardingProfile } from "@/lib/types";

export function hashProfile(profile: OnboardingProfile | null): string {
  if (!profile) return "anonymous";
  const payload = JSON.stringify({
    interests: [...profile.interests].sort(),
    career: profile.career,
    focusType: profile.focusType,
    tone: profile.tone,
    completed: profile.completed,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export function buildReaderContext(profile: OnboardingProfile): string {
  return buildReaderNote(profile);
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

export function canGeneratePersonalizedSection(
  profile: OnboardingProfile | null
): profile is OnboardingProfile {
  if (!profile) return false;
  return canPersonalize({ profile });
}
