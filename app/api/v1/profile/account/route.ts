import { requireApiUser } from "@/lib/api/auth";
import { apiError, apiJson, apiOptions } from "@/lib/api/response";
import { deleteAccountForUser } from "@/lib/services/delete-account";

export const dynamic = "force-dynamic";

/**
 * Permanently delete the authenticated user's account and stored data.
 * Apple App Store requires equivalent in-app account deletion (Guideline 5.1.1(v)).
 */
export async function DELETE(req: Request) {
  const authResult = await requireApiUser(req);
  if (!authResult.ok) {
    return apiError(authResult.error, authResult.status);
  }

  const result = await deleteAccountForUser(authResult.userId);
  if (!result.ok) {
    return apiError(result.error, 500, { stage: result.stage });
  }

  return apiJson({ ok: true, deleted: true });
}

export async function OPTIONS() {
  return apiOptions();
}
