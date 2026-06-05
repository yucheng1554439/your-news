import { requireApiUser } from "@/lib/api/auth";
import { apiError, apiJson, apiOptions } from "@/lib/api/response";
import { getProfileIntelligenceForUserId } from "@/lib/services/profile-intelligence";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authResult = await requireApiUser(req);
  if (!authResult.ok) {
    return apiError(authResult.error, authResult.status);
  }

  try {
    const payload = await getProfileIntelligenceForUserId(authResult.userId);
    if (!payload) {
      return apiError("Complete onboarding to view your intelligence profile", 404);
    }
    return apiJson(payload);
  } catch (err) {
    console.error(
      "[API_V1] profile_intelligence_failed",
      err instanceof Error ? err.message : err
    );
    return apiError("Failed to load intelligence profile", 500);
  }
}

export async function OPTIONS() {
  return apiOptions();
}
