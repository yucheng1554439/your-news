import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { StoryCard } from "@/components/StoryCard";
import { getSavedStoriesFromClerk } from "@/app/actions/saved-stories";
import { getStories } from "@/lib/data/stories";
import { getOnboardingFromClerk } from "@/app/actions/onboarding";
import { resolveSavedStories } from "@/lib/saved-stories/resolve";

export const dynamic = "force-dynamic";

export default async function SavedStoriesPage() {
  const profile = await getOnboardingFromClerk();
  const savedRefs = await getSavedStoriesFromClerk();
  const { stories: live } = await getStories({ profile, enrich: false });
  const stories = resolveSavedStories(savedRefs, live);

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-10 space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Your desk
          </p>
          <h1 className="font-serif text-3xl text-white sm:text-4xl">
            Saved stories
          </h1>
          <p className="max-w-xl text-sm text-zinc-400">
            Stories you flagged for follow-up. Saved to your account and available
            across sessions.
          </p>
        </header>

        {stories.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/40 px-6 py-16 text-center">
            <p className="font-serif text-xl text-zinc-300">
              No saved stories yet
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Tap the bookmark on any story to build your personal reading queue.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block text-sm text-white underline-offset-4 hover:underline"
            >
              Return to briefing
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => (
              <StoryCard key={story.slug} story={story} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
