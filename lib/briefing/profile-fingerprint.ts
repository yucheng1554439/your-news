import type { OnboardingProfile } from "@/lib/types";

/** Shared profile fingerprint for briefing cache keys (client + server). */
export function getProfileBriefingFingerprint(
  profile: OnboardingProfile | null
): string {
  if (!profile) return "anon";
  return [
    profile.updatedAt ?? 0,
    [...profile.interests].sort().join(","),
    profile.career ?? "",
    profile.focusType ?? "",
    profile.tone ?? "",
  ].join("|");
}
