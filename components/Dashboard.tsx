"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HeroSection } from "@/components/HeroSection";
import { IntelligenceRefreshControl } from "@/components/IntelligenceRefreshControl";
import { CategoryFilterBar } from "@/components/CategoryFilterBar";
import { FeedStatus } from "@/components/FeedStatus";
import { StoryCard } from "@/components/StoryCard";
import {
  filterStoriesByCategory,
  type TopStoryCategory,
} from "@/lib/feed/category-filter";
import {
  getGlobalStories,
  getPersonalizedStories,
} from "@/lib/personalization";
import { useOnboardingSync } from "@/hooks/use-onboarding-sync";
import { useWeeklyBriefing } from "@/hooks/use-weekly-briefing";
import { getFeaturedStory } from "@/lib/data/featured";
import type { WeeklyBriefingMode } from "@/lib/briefing/weekly-engine";
import type { WeeklyBriefing } from "@/lib/weekly-briefing";
import type { OnboardingProfile, Story } from "@/lib/types";

interface DashboardProps {
  stories: Story[];
  briefings?: Partial<Record<WeeklyBriefingMode, WeeklyBriefing>>;
  intelligenceUpdatedAt?: number | null;
  storiesFetchedAt?: number;
  hasIntelligenceSnapshot?: boolean;
  persistenceConfigured?: boolean;
  feedError?: string | null;
  feedStale?: boolean;
  feedLiveDelayed?: boolean;
  cacheStatus?: "fresh" | "stale" | "empty";
  fromPersistentStore?: boolean;
  profileFromServer?: OnboardingProfile | null;
}

export function Dashboard({
  stories,
  briefings = {},
  intelligenceUpdatedAt = null,
  storiesFetchedAt,
  hasIntelligenceSnapshot = false,
  persistenceConfigured = false,
  feedError,
  feedStale,
  feedLiveDelayed,
  cacheStatus,
  fromPersistentStore,
  profileFromServer,
}: DashboardProps) {
  const router = useRouter();
  const { synced, isOnboardingComplete, profile: syncedProfile } =
    useOnboardingSync();
  const [topCategory, setTopCategory] = useState<TopStoryCategory>("all");
  const [isRefreshingIntelligence, setIsRefreshingIntelligence] =
    useState(false);

  const profile = syncedProfile ?? profileFromServer ?? null;

  const { feedMode, handleFeedModeChange, heroBriefing } = useWeeklyBriefing(
    stories,
    profile,
    briefings
  );

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

  useEffect(() => {
    startTransition(() => setTopCategory("all"));
  }, [feedMode]);

  const featured =
    getFeaturedStory(
      feedStories.length > 0 ? feedStories : stories,
      profile,
      feedMode === "personalized"
    ) ??
    feedStories[0] ??
    stories[0];
  const relevant = feedStories.slice(0, 4);
  const topStoriesPool = useMemo(
    () => filterStoriesByCategory(feedStories, topCategory),
    [feedStories, topCategory]
  );
  const topStories = topStoriesPool.slice(0, 6);

  if (!synced || !isOnboardingComplete || !profile) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-pulse rounded-full border border-white/20 border-t-white" />
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="space-y-6">
        <FeedStatus
          error={
            feedError ??
            "No cached stories yet. Add Upstash Redis (or wait for first successful ingest) so the feed survives rate limits."
          }
          liveDelayed={feedLiveDelayed}
          cacheStatus={cacheStatus}
        />
        <div className="flex justify-center">
          <IntelligenceRefreshControl
            lastUpdated={intelligenceUpdatedAt}
            storiesFetchedAt={storiesFetchedAt}
            hasSnapshot={hasIntelligenceSnapshot}
            persistenceConfigured={persistenceConfigured}
          />
        </div>
      </div>
    );
  }

  const usePersonalizedBadges =
    feedMode === "personalized" && Boolean(profile.completed);

  return (
    <div className="space-y-10 pb-16">
      <FeedStatus
        error={feedError}
        stale={feedStale}
        liveDelayed={feedLiveDelayed}
        cacheStatus={cacheStatus}
        fromPersistentStore={fromPersistentStore}
      />

      <HeroSection
        feedMode={feedMode}
        onFeedModeChange={handleFeedModeChange}
        briefing={heroBriefing}
        lastUpdated={intelligenceUpdatedAt}
        storiesFetchedAt={storiesFetchedAt}
        hasIntelligenceSnapshot={hasIntelligenceSnapshot}
        persistenceConfigured={persistenceConfigured}
        isRefreshing={isRefreshingIntelligence}
        onRefreshingChange={setIsRefreshingIntelligence}
      />

      {featured && (
        <section className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Lead Story
          </p>
          <StoryCard
            story={featured}
            variant="featured"
            usePersonalizedImportance={usePersonalizedBadges}
          />
        </section>
      )}

      {relevant.length > 0 && (
        <section className="space-y-5">
          <div>
            <h2 className="font-serif text-xl text-white sm:text-2xl">
              {feedMode === "personalized"
                ? "Relevant to You"
                : "Global Signal"}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              {feedMode === "personalized"
                ? "Ranked for your career, interests, and focus"
                : "Highest editorial weight worldwide"}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {relevant.map((story) => (
              <StoryCard
                key={story.slug}
                story={story}
                usePersonalizedImportance={usePersonalizedBadges}
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-5">
        <div>
          <h2 className="font-serif text-xl text-white sm:text-2xl">
            Top Stories
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {feedMode === "personalized"
              ? "Your intelligent feed — filter by domain"
              : "Global desk — filter by domain"}
          </p>
        </div>
        <CategoryFilterBar value={topCategory} onChange={setTopCategory} />
        {topStories.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topStories.map((story) => (
              <StoryCard
                key={story.slug}
                story={story}
                usePersonalizedImportance={usePersonalizedBadges}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            No stories in this category right now. Try another filter or check
            back after the next refresh.
          </p>
        )}
      </section>
    </div>
  );
}
