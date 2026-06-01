"use server";

import { auth } from "@clerk/nextjs/server";
import type { TopicPreferences } from "@/lib/personalization/topic-preferences";
import {
  topicPreferencesPayloadStats,
  validateTopicPreferences,
} from "@/lib/personalization/validate-topic-preferences";
import {
  getTopicPreferencesForUser,
  patchUserProfile,
} from "@/lib/user-profile/store";

export type SaveTopicPreferencesResult =
  | { ok: true; topicPreferences: TopicPreferences }
  | {
      ok: false;
      error: string;
      category: "validation" | "storage" | "auth" | "unknown";
    };

export async function getTopicPreferencesAction(): Promise<TopicPreferences | null> {
  const { userId } = await auth();
  if (!userId) return null;
  return getTopicPreferencesForUser(userId);
}

export async function saveTopicPreferencesAction(
  topicPreferences: TopicPreferences
): Promise<SaveTopicPreferencesResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Not authenticated", category: "auth" };
  }

  const validation = validateTopicPreferences(topicPreferences);
  if (!validation.ok) {
    console.warn(
      "[USER_PROFILE] validation_rejected",
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
    "[USER_PROFILE] save_topic_preferences",
    JSON.stringify({
      userId,
      moreCount: stats.moreCount,
      lessCount: stats.lessCount,
      neverCount: stats.neverCount,
      payloadSize: stats.payloadSize,
    })
  );

  const result = await patchUserProfile(userId, {
    topicPreferences: validation.normalized,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      category: result.category === "storage" ? "storage" : "unknown",
    };
  }

  return { ok: true, topicPreferences: result.record.topicPreferences };
}
