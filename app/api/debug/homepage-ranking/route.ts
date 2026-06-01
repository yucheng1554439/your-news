import { NextResponse } from "next/server";
import { getOnboardingFromClerk } from "@/app/actions/onboarding";
import { getReadingSignalsFromClerk } from "@/app/actions/reading-signals";
import { getSavedStoriesFromClerk } from "@/app/actions/saved-stories";
import { loadPlatformDashboard } from "@/lib/intelligence/platform-snapshot";
import { auditHomepagePlacements } from "@/lib/ranking/explain";

export const dynamic = "force-dynamic";

function debugEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.DEBUG_RANKING === "1"
  );
}

export async function GET() {
  if (!debugEnabled()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const profile = await getOnboardingFromClerk();
  if (!profile?.completed) {
    return NextResponse.json({ error: "Complete onboarding first" }, { status: 400 });
  }

  const dashboard = await loadPlatformDashboard(profile);
  const audits = auditHomepagePlacements(
    dashboard.stories,
    dashboard.globalStories,
    profile,
    dashboard.userIntelligence
  );

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    audits,
    storyCount: {
      forYou: dashboard.stories.length,
      global: dashboard.globalStories.length,
    },
  });
}
