import { Navbar } from "@/components/Navbar";
import { Dashboard } from "@/components/Dashboard";
import { getOnboardingFromClerk } from "@/app/actions/onboarding";
import { loadPlatformDashboard } from "@/lib/intelligence/platform-snapshot";
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const profile = await getOnboardingFromClerk();
  const dashboard = await loadPlatformDashboard(profile);

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Dashboard
          stories={dashboard.stories}
          briefings={dashboard.briefings}
          intelligenceUpdatedAt={dashboard.intelligenceUpdatedAt}
          storiesFetchedAt={dashboard.fetchedAt}
          hasIntelligenceSnapshot={dashboard.hasIntelligenceSnapshot}
          persistenceConfigured={dashboard.persistenceConfigured}
          feedError={dashboard.error}
          feedStale={dashboard.cacheStatus === "stale"}
          feedLiveDelayed={dashboard.liveDelayed}
          cacheStatus={dashboard.cacheStatus}
          fromPersistentStore={dashboard.fromPersistentStore}
          profileFromServer={profile}
        />
      </main>
    </div>
  );
}
