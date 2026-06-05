import { requireApiUser } from "@/lib/api/auth";
import { apiError, apiJson, apiOptions } from "@/lib/api/response";
import {
  getSavedStoriesForUserId,
  toggleSavedStoryForUserId,
} from "@/lib/services/saved-stories";
import type { Story } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authResult = await requireApiUser(req);
  if (!authResult.ok) {
    return apiError(authResult.error, authResult.status);
  }

  try {
    const items = await getSavedStoriesForUserId(authResult.userId);
    return apiJson({ ok: true, items });
  } catch (err) {
    console.error(
      "[API_V1] saved_get_failed",
      err instanceof Error ? err.message : err
    );
    return apiError("Failed to load saved stories", 500);
  }
}

export async function POST(req: Request) {
  const authResult = await requireApiUser(req);
  if (!authResult.ok) {
    return apiError(authResult.error, authResult.status);
  }

  let body: { story?: Story };
  try {
    body = (await req.json()) as { story?: Story };
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  if (!body.story?.slug || !body.story.headline) {
    return apiError("Missing story in body", 400);
  }

  const result = await toggleSavedStoryForUserId(
    authResult.userId,
    body.story
  );

  if (!result.ok) {
    return apiError(result.error, 500);
  }

  return apiJson({
    ok: true,
    saved: result.saved,
    items: result.items,
  });
}

export async function OPTIONS() {
  return apiOptions();
}
