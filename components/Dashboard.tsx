"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWeeklyBriefing } from "@/app/actions/briefing";
import { HeroSection } from "@/components/HeroSection";
import { CategoryFilterBar } from "@/components/CategoryFilterBar";
import { FeedSection } from "@/components/FeedSection";
import { FeedStatus } from "@/components/FeedStatus";
import { StoryCard } from "@/components/StoryCard";
import type { FeedMode } from "@/components/ToggleTabs";
import { getFeaturedStory } from "@/lib/data/featured";
import {
  buildWeeklyBriefingSync,
  type WeeklyBriefing,
} from "@/lib/weekly-briefing";
import {
  filterStoriesByCategory,
  type TopStoryCategory,
} from "@/lib/feed/category-filter";
import {
  getGlobalStories,
  getPersonalizedStories,
} from "@/lib/personalization";
import { useOnboardingSync } from "@/hooks/use-onboarding-sync";
import type { OnboardingProfile, Story } from "@/lib/types";

const FEED_REFRESH_MS = 90_000;

interface DashboardProps {
  stories: Story[];
  feedError?: string | null;
  feedStale?: boolean;
  profileFromServer?: OnboardingProfile | null;
}

export function Dashboard({
  stories,
  feedError,
  feedStale,
  profileFromServer,
}: DashboardProps) {
  const router = useRouter();
  const { synced, isOnboardingComplete, profile: syncedProfile } =
    useOnboardingSync();
  const [feedMode, setFeedMode] = useState<FeedMode>("personalized");
  const [topCategory, setTopCategory] = useState<TopStoryCategory>("all");
  const [briefing, setBriefing] = useState<WeeklyBriefing | null>(null);

  const profile = syncedProfile ?? profileFromServer ?? null;

  useEffect(() => {
    if (!synced) return;
    if (!isOnboardingComplete) {
      router.replace("/onboarding/interests");
    }
  }, [synced, isOnboardingComplete, router]);

  const feedStories = useMemo(() => {
    if (!profile || stories.length === 0) return [];
    return feedMode === "personalized"
      ? getPersonalizedStories(profile, stories)
      : getGlobalStories(stories);
  }, [profile, feedMode, stories]);

  const briefingMode = feedMode === "personalized" ? "for-you" : "global";

  useEffect(() => {
    startTransition(() => setTopCategory("all"));
  }, [feedMode]);

  useEffect(() => {
    if (!profile || stories.length === 0) return;

    let cancelled = false;
    startTransition(() => {
      setBriefing(buildWeeklyBriefingSync(stories, briefingMode, profile));
    });

    void fetchWeeklyBriefing(stories, briefingMode, profile).then(
      (resolved) => {
        if (!cancelled) {
          startTransition(() => setBriefing(resolved));
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [stories, briefingMode, profile]);

  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, FEED_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [router]);

  const featured = getFeaturedStory(
    feedStories.length > 0 ? feedStories : stories
  );
  const relevant = feedStories.slice(0, 4);
  const topStoriesPool = useMemo(
    () => filterStoriesByCategory(feedStories, topCategory),
    [feedStories, topCategory]
  );
  const topStories = topStoriesPool.slice(0, 6);
  const markets = feedStories
    .filter((s) => s.category === "markets")
    .slice(0, 3);
  const aiTech = feedStories
    .filter((s) => s.category === "ai" || s.category === "technology")
    .slice(0, 3);

  if (!synced || !isOnboardingComplete || !profile) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-pulse rounded-full border border-white/20 border-t-white" />
      </div>
    );
  }

  if (!featured && stories.length === 0) {
    return (
      <div className="space-y-6">
        <FeedStatus error={feedError ?? "No stories available right now."} />
        <p className="text-center text-sm text-zinc-500">
          Check your News API key in .env.local and try again shortly.
        </p>
      </div>
    );
  }

  const heroBriefing =
    briefing ??
    buildWeeklyBriefingSync(stories, briefingMode, profile);

  return (
    <div className="space-y-10 pb-16">
      <FeedStatus error={feedError} stale={feedStale} />

      <HeroSection
        feedMode={feedMode}
        onFeedModeChange={setFeedMode}
        briefing={heroBriefing}
      />

      {featured && (
        <section className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Lead Story
          </p>
          <StoryCard story={featured} variant="featured" />
        </section>
      )}

      <FeedSection
        title="Relevant to You"
        subtitle={
          feedMode === "personalized"
            ? "Ranked by your interests and career focus"
            : "Latest high-signal stories worldwide"
        }
        stories={relevant}
      />

      <section className="space-y-5">
        <div>
          <h2 className="font-serif text-xl text-white sm:text-2xl">
            Top Stories
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            What ambitious readers are tracking
          </p>
        </div>
        <CategoryFilterBar value={topCategory} onChange={setTopCategory} />
        {topStories.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topStories.map((story) => (
              <StoryCard key={story.slug} story={story} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            No stories in this category right now. Try another filter or check
            back after the next refresh.
          </p>
        )}
      </section>

      <FeedSection
        title="Markets"
        subtitle="Macro, policy, and capital flows"
        stories={markets}
      />

      <FeedSection
        title="AI & Technology"
        subtitle="Infrastructure, models, and the frontier"
        stories={aiTech}
      />
    </div>
  );
}
