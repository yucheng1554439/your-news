import { requireApiUser } from "@/lib/api/auth";
import { resolveDashboardIsolationDebug } from "@/lib/api/dashboard-debug";
import { serializeDashboardResponse } from "@/lib/api/serialize-dashboard";
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

    const debugIsolation =
      new URL(req.url).searchParams.get("debugIsolation") === "1";
    const debug = debugIsolation
      ? await resolveDashboardIsolationDebug(authResult.userId, profile)
      : undefined;

    return apiJson(
      serializeDashboardResponse(profile, dashboard, { debug }),
      { status: 200 }
    );
  } catch (err) {
    console.error(
      "[API_V1] dashboard_failed",
      err instanceof Error ? err.message : err
    );
    return apiError("Failed to load dashboard", 500);
  }
}

export async function OPTIONS() {
  return apiOptions();
}
