import type { OnboardingProfile } from "@/lib/types";

/** Extensible reader signals — plug in behavior as the product evolves. */
export type BehaviorSignals = {
  savedSlugs?: string[];
  readSlugs?: string[];
  skippedSlugs?: string[];
  avgReadSecondsBySlug?: Record<string, number>;
  followedTopics?: string[];
  preferredSources?: string[];
  readingFrequency?: "daily" | "weekly" | "occasional";
};

export type PersonalizationSignals = {
  profile: OnboardingProfile;
  behavior?: BehaviorSignals;
};

export function signalsFromProfile(
  profile: OnboardingProfile,
  behavior?: BehaviorSignals
): PersonalizationSignals {
  return { profile, behavior };
}

/** Stable hash input for caches when behavior signals are added. */
export function hashSignals(signals: PersonalizationSignals): string {
  const { profile, behavior } = signals;
  return JSON.stringify({
    updatedAt: profile.updatedAt ?? 0,
    interests: [...profile.interests].sort(),
    career: profile.career,
    focusType: profile.focusType,
    tone: profile.tone,
    saved: behavior?.savedSlugs?.slice(0, 20).sort(),
    followed: behavior?.followedTopics?.slice(0, 10).sort(),
  });
}
