import type { OnboardingProfile } from "@/lib/types";
import { defaultProfile } from "@/lib/onboarding";

function profileCompleteness(profile: OnboardingProfile): number {
  let score = 0;
  if (profile.interests.length > 0) score += 3;
  if (profile.career) score += 2;
  if (profile.focusType) score += 1;
  if (profile.tone) score += 1;
  if (profile.completed) score += 1;
  return score;
}

export function reconcileOnboardingProfiles(
  local: OnboardingProfile,
  remote: OnboardingProfile | null
): OnboardingProfile {
  if (!remote) return local;

  const localTs = local.updatedAt ?? 0;
  const remoteTs = remote.updatedAt ?? 0;

  if (localTs > remoteTs) return local;
  if (remoteTs > localTs) return remote;

  if (!local.completed && !remote.completed) {
    const localScore = profileCompleteness(local);
    const remoteScore = profileCompleteness(remote);
    if (localScore > remoteScore) return local;
    if (remoteScore > localScore) return remote;
  }

  if (remote.completed && !local.completed) return remote;
  if (local.completed && local.interests.length > 0) return local;

  return remote.completed ? remote : local;
}

export function stampProfile(profile: OnboardingProfile): OnboardingProfile {
  return {
    ...defaultProfile,
    ...profile,
    updatedAt: profile.updatedAt ?? Date.now(),
  };
}
