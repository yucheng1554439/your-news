import { requireApiUser } from "@/lib/api/auth";
import { apiError, apiJson, apiOptions } from "@/lib/api/response";
import type { TopicPreferences } from "@/lib/personalization/topic-preferences";
import {
  getTopicPreferencesForUserId,
  saveTopicPreferencesForUserId,
} from "@/lib/services/topic-preferences";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authResult = await requireApiUser(req);
  if (!authResult.ok) {
    return apiError(authResult.error, authResult.status);
  }

  try {
    const topicPreferences = await getTopicPreferencesForUserId(
      authResult.userId
    );
    return apiJson({ ok: true, topicPreferences });
  } catch (err) {
    console.error(
      "[API_V1] topics_get_failed",
      err instanceof Error ? err.message : err
    );
    return apiError("Failed to load topic preferences", 500);
  }
}

export async function PUT(req: Request) {
  const authResult = await requireApiUser(req);
  if (!authResult.ok) {
    return apiError(authResult.error, authResult.status);
  }

  let body: { topicPreferences?: TopicPreferences };
  try {
    body = (await req.json()) as { topicPreferences?: TopicPreferences };
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  if (!body.topicPreferences) {
    return apiError("Missing topicPreferences in body", 400);
  }

  const result = await saveTopicPreferencesForUserId(
    authResult.userId,
    body.topicPreferences
  );

  if (!result.ok) {
    const status = result.category === "validation" ? 400 : 500;
    return apiError(result.error, status, {
      category: result.category,
      code: result.code,
    });
  }

  return apiJson({ ok: true, topicPreferences: result.topicPreferences });
}

export async function OPTIONS() {
  return apiOptions();
}
