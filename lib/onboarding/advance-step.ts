"use client";

import type { OnboardingProfile } from "@/lib/types";
import type { TopicPreferences } from "@/lib/personalization/topic-preferences";
import {
  topicPreferencesPayloadStats,
  validateTopicPreferences,
} from "@/lib/personalization/validate-topic-preferences";
import { saveOnboardingProfileAsync } from "@/lib/onboarding";
import { saveTopicPreferencesAction } from "@/app/actions/user-profile";

export type PersistOnboardingResult =
  | { ok: true; profile: OnboardingProfile }
  | {
      ok: false;
      error: string;
      category?: "validation" | "storage" | "auth" | "unknown";
    };

/** Saves to localStorage and Clerk; surfaces Clerk failures. */
export async function persistOnboardingStep(
  userId: string,
  partial: Partial<OnboardingProfile>
): Promise<PersistOnboardingResult> {
  if (partial.topicPreferences) {
    return persistTopicPreferencesStep(userId, partial.topicPreferences);
  }

  try {
    const profile = await saveOnboardingProfileAsync(partial, userId);
    return { ok: true, profile };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not save preferences";
    console.error(
      "[ONBOARDING_SAVE] client_persist_failed",
      JSON.stringify({ userId, error: message })
    );
    return { ok: false, error: message };
  }
}

/** Validates, saves locally + KV profile store (not Clerk). */
export async function persistTopicPreferencesStep(
  userId: string,
  topicPreferences: TopicPreferences
): Promise<PersistOnboardingResult> {
  const validation = validateTopicPreferences(topicPreferences);
  if (!validation.ok) {
    console.warn(
      "[USER_PROFILE] client_validation_rejected",
      JSON.stringify({
        userId,
        code: validation.code,
        message: validation.message,
        ...topicPreferencesPayloadStats(topicPreferences),
      })
    );
    return {
      ok: false,
      error: validation.message,
      category: "validation",
    };
  }

  const stats = topicPreferencesPayloadStats(validation.normalized);
  console.log(
    "[USER_PROFILE] client_persist_start",
    JSON.stringify({
      userId,
      moreCount: stats.moreCount,
      lessCount: stats.lessCount,
      neverCount: stats.neverCount,
      payloadSize: stats.payloadSize,
    })
  );

  try {
    const profile = await saveOnboardingProfileAsync(
      { topicPreferences: validation.normalized },
      userId,
      { skipClerk: true }
    );

    const storeResult = await saveTopicPreferencesAction(
      validation.normalized
    );
    if (!storeResult.ok) {
      console.error(
        "[USER_PROFILE] client_store_failed",
        JSON.stringify({
          userId,
          category: storeResult.category,
          error: storeResult.error,
          ...stats,
        })
      );
      return {
        ok: false,
        error: storeResult.error,
        category: storeResult.category,
      };
    }

    return { ok: true, profile };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not save preferences";
    console.error(
      "[USER_PROFILE] client_persist_failed",
      JSON.stringify({ userId, error: message, ...stats })
    );
    return { ok: false, error: message };
  }
}
