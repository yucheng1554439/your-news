import type { OnboardingProfile } from "@/lib/types";
import { defaultProfile } from "@/lib/onboarding";

export function reconcileOnboardingProfiles(
  local: OnboardingProfile,
  remote: OnboardingProfile | null
): OnboardingProfile {
  if (!remote) return local;

  const localTs = local.updatedAt ?? 0;
  const remoteTs = remote.updatedAt ?? 0;

  if (localTs > remoteTs) return local;
  if (remoteTs > localTs) return remote;

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
