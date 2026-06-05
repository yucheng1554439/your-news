import { requireApiUser } from "@/lib/api/auth";
import { serializeIntelligenceRefresh } from "@/lib/api/serialize-intelligence-refresh";
import { apiError, apiJson, apiOptions } from "@/lib/api/response";
import { refreshPlatformIntelligence } from "@/lib/intelligence/platform-snapshot";
import { getOnboardingForUser } from "@/lib/services/onboarding";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const authResult = await requireApiUser(req);
  if (!authResult.ok) {
    return apiError(authResult.error, authResult.status);
  }

  try {
    const profile = await getOnboardingForUser(authResult.userId);
    const result = await refreshPlatformIntelligence(profile, {
      userId: authResult.userId,
    });

    const payload = serializeIntelligenceRefresh(result);
    return apiJson(payload, { status: result.ok ? 200 : 500 });
  } catch (err) {
    console.error(
      "[API_V1] intelligence_refresh_failed",
      err instanceof Error ? err.message : err
    );
    return apiError("Intelligence refresh failed", 500);
  }
}

export async function OPTIONS() {
  return apiOptions();
}
