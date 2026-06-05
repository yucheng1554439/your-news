import "server-only";

import type { TopicPreferences } from "@/lib/personalization/topic-preferences";
import {
  topicPreferencesPayloadStats,
  validateTopicPreferences,
} from "@/lib/personalization/validate-topic-preferences";
import {
  getTopicPreferencesForUser,
  patchUserProfile,
} from "@/lib/user-profile/store";

export type TopicPreferencesSaveResult =
  | { ok: true; topicPreferences: TopicPreferences }
  | {
      ok: false;
      error: string;
      category: "validation" | "storage" | "unknown";
      code?: string;
    };

export async function getTopicPreferencesForUserId(
  userId: string
): Promise<TopicPreferences> {
  return getTopicPreferencesForUser(userId);
}

export async function saveTopicPreferencesForUserId(
  userId: string,
  topicPreferences: TopicPreferences
): Promise<TopicPreferencesSaveResult> {
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
      code: validation.code,
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
