"use server";

import { auth } from "@clerk/nextjs/server";
import type { TopicPreferences } from "@/lib/personalization/topic-preferences";
import {
  getTopicPreferencesForUserId,
  saveTopicPreferencesForUserId,
} from "@/lib/services/topic-preferences";

export type SaveTopicPreferencesResult =
  | { ok: true; topicPreferences: TopicPreferences }
  | {
      ok: false;
      error: string;
      category: "validation" | "storage" | "auth" | "unknown";
      code?: string;
    };

export async function getTopicPreferencesAction(): Promise<TopicPreferences | null> {
  const { userId } = await auth();
  if (!userId) return null;
  return getTopicPreferencesForUserId(userId);
}

export async function saveTopicPreferencesAction(
  topicPreferences: TopicPreferences
): Promise<SaveTopicPreferencesResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Not authenticated", category: "auth" };
  }

  const result = await saveTopicPreferencesForUserId(userId, topicPreferences);
  if (!result.ok) {
    return { ...result, category: result.category };
  }
  return result;
}
