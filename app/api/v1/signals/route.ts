import { requireApiUser } from "@/lib/api/auth";
import { serializeSignalsApi } from "@/lib/api/serialize-signals-api";
import { apiError, apiJson, apiOptions } from "@/lib/api/response";
import { loadPlatformDashboard } from "@/lib/intelligence/platform-snapshot";
import { getOnboardingForUser } from "@/lib/services/onboarding";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authResult = await requireApiUser(req);
  if (!authResult.ok) {
    return apiError(authResult.error, authResult.status);
  }

  try {
    const profile = await getOnboardingForUser(authResult.userId);
    const dashboard = await loadPlatformDashboard(profile, {
      userId: authResult.userId,
    });

    const stories =
      dashboard.stories.length > 0
        ? dashboard.stories
        : dashboard.globalStories;

    return apiJson(
      serializeSignalsApi(
        stories,
        profile,
        dashboard.userIntelligence,
        true
      )
    );
  } catch (err) {
    console.error(
      "[API_V1] signals_failed",
      err instanceof Error ? err.message : err
    );
    return apiError("Failed to load signals", 500);
  }
}

export async function OPTIONS() {
  return apiOptions();
}
