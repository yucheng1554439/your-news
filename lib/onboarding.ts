"use client";

import type { Career, FocusType, OnboardingProfile, Tone } from "@/lib/types";
import { saveOnboardingToClerk } from "@/app/actions/onboarding";

const STORAGE_PREFIX = "your-news-onboarding";

export const defaultProfile: OnboardingProfile = {
  interests: [],
  career: null,
  focusType: null,
  tone: null,
  completed: false,
  updatedAt: 0,
};

function storageKey(userId: string | null): string {
  return userId ? `${STORAGE_PREFIX}-${userId}` : STORAGE_PREFIX;
}

export function getOnboardingProfile(userId?: string | null): OnboardingProfile {
  if (typeof window === "undefined") return defaultProfile;

  try {
    const raw = localStorage.getItem(storageKey(userId ?? null));
    if (!raw) return defaultProfile;
    return { ...defaultProfile, ...JSON.parse(raw) };
  } catch {
    return defaultProfile;
  }
}

export function hydrateOnboardingProfile(
  profile: OnboardingProfile,
  userId: string
): OnboardingProfile {
  if (typeof window === "undefined") return profile;
  const stamped = {
    ...profile,
    updatedAt: profile.updatedAt ?? Date.now(),
  };
  localStorage.setItem(storageKey(userId), JSON.stringify(stamped));
  return stamped;
}

/** Persists locally and to Clerk; returns when Clerk save finishes. */
export async function saveOnboardingProfileAsync(
  partial: Partial<OnboardingProfile>,
  userId?: string | null
): Promise<OnboardingProfile> {
  const current = getOnboardingProfile(userId);
  const updated: OnboardingProfile = {
    ...current,
    ...partial,
    updatedAt: Date.now(),
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(storageKey(userId ?? null), JSON.stringify(updated));
  }

  if (userId) {
    await saveOnboardingToClerk(updated);
  }

  return updated;
}

export function saveOnboardingProfile(
  partial: Partial<OnboardingProfile>,
  userId?: string | null
): OnboardingProfile {
  const current = getOnboardingProfile(userId);
  const updated: OnboardingProfile = {
    ...current,
    ...partial,
    updatedAt: Date.now(),
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(storageKey(userId ?? null), JSON.stringify(updated));
  }

  if (userId) {
    void saveOnboardingToClerk(updated);
  }

  return updated;
}

export function setInterests(
  interests: string[],
  userId?: string | null
): OnboardingProfile {
  return saveOnboardingProfile({ interests }, userId);
}

export async function setInterestsAsync(
  interests: string[],
  userId: string
): Promise<OnboardingProfile> {
  return saveOnboardingProfileAsync({ interests }, userId);
}

export function setCareer(
  career: Career,
  userId?: string | null
): OnboardingProfile {
  return saveOnboardingProfile({ career }, userId);
}

export async function setCareerAsync(
  career: Career,
  userId: string
): Promise<OnboardingProfile> {
  return saveOnboardingProfileAsync({ career }, userId);
}

export function setFocusType(
  focusType: FocusType,
  userId?: string | null
): OnboardingProfile {
  return saveOnboardingProfile({ focusType }, userId);
}

export function setTone(tone: Tone, userId?: string | null): OnboardingProfile {
  return saveOnboardingProfile({ tone }, userId);
}

export function completeOnboarding(
  userId?: string | null
): OnboardingProfile {
  return saveOnboardingProfile({ completed: true }, userId);
}

export async function completeOnboardingAsync(
  userId: string,
  partial?: Partial<OnboardingProfile>
): Promise<OnboardingProfile> {
  return saveOnboardingProfileAsync({ ...partial, completed: true }, userId);
}

export function isOnboardingComplete(userId?: string | null): boolean {
  return getOnboardingProfile(userId).completed;
}

export function resetOnboarding(userId?: string | null): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKey(userId ?? null));
  void saveOnboardingToClerk(defaultProfile);
}
