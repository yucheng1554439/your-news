import { Navbar } from "@/components/Navbar";
import { Dashboard } from "@/components/Dashboard";
import { getOnboardingFromClerk } from "@/app/actions/onboarding";
import { getStories } from "@/lib/data/stories";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const { userId } = await auth();
  const profile = await getOnboardingFromClerk();
  const { stories, error, fromCache } = await getStories({
    profile,
    userId,
  });

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Dashboard
          stories={stories}
          feedError={error}
          feedStale={fromCache && Boolean(error)}
          profileFromServer={profile}
        />
      </main>
    </div>
  );
}
