"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HeroSection } from "@/components/HeroSection";
import { IntelligenceRefreshControl } from "@/components/IntelligenceRefreshControl";
import { CategoryFilterBar } from "@/components/CategoryFilterBar";
import { FeedStatus } from "@/components/FeedStatus";
import { MoreStoriesFeed } from "@/components/MoreStoriesFeed";
import { StoryCard } from "@/components/StoryCard";
import {
  filterStoriesByCategory,
  type TopStoryCategory,
} from "@/lib/feed/category-filter";
import { CategoryEngagementTracker } from "@/components/CategoryEngagementTracker";
import { SignalsDashboard } from "@/components/SignalsDashboard";
import {
  getGlobalStories,
  getPersonalizedStories,
  rankStoriesForUser,
  rankStoriesGlobal,
  selectMoreStoriesForFeed,
  selectRelevantStoriesForUser,
  selectTopStoriesForUser,
} from "@/lib/personalization";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import { useOnboardingSync } from "@/hooks/use-onboarding-sync";
import { useBriefing } from "@/hooks/use-briefing";
import { getFeaturedStory } from "@/lib/data/featured";
import type { CadenceBriefings } from "@/lib/briefing/types";
import type { OnboardingProfile, Story } from "@/lib/types";

interface DashboardProps {
  stories: Story[];
  globalStories?: Story[];
  briefings?: CadenceBriefings;
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
  userIntelligence?: UserIntelligenceProfile | null;
}

export function Dashboard({
  stories,
  globalStories,
  briefings = { daily: {}, weekly: {} },
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
  userIntelligence = null,
}: DashboardProps) {
  const router = useRouter();
  const { synced, isOnboardingComplete, profile: syncedProfile } =
    useOnboardingSync();
  const [topCategory, setTopCategory] = useState<TopStoryCategory>("all");
  const [isRefreshingIntelligence, setIsRefreshingIntelligence] =
    useState(false);

  const profile = syncedProfile ?? profileFromServer ?? null;

  const {
    feedMode,
    cadence,
    handleFeedModeChange,
    handleCadenceChange,
    heroBriefing,
  } = useBriefing(stories, profile, briefings);

  useEffect(() => {
    if (!synced) return;
    if (!isOnboardingComplete) {
      router.replace("/onboarding/interests");
    }
  }, [synced, isOnboardingComplete, router]);

  const globalPool = useMemo(() => {
    if (globalStories && globalStories.length >= stories.length) {
      return globalStories;
    }
    return globalStories ?? stories;
  }, [globalStories, stories]);

  const rankedFullPool = useMemo(() => {
    if (!profile || stories.length === 0) return [];
    if (feedMode === "personalized") {
      return rankStoriesForUser(stories, profile, userIntelligence);
    }
    return rankStoriesGlobal(globalPool);
  }, [profile, feedMode, stories, globalPool, userIntelligence]);

  const feedStories = useMemo(() => {
    if (!profile || stories.length === 0) return [];
    if (feedMode === "personalized") {
      return getPersonalizedStories(profile, stories, undefined, userIntelligence);
    }
    return getGlobalStories(globalPool);
  }, [profile, feedMode, stories, globalPool, userIntelligence]);

  useEffect(() => {
    startTransition(() => setTopCategory("all"));
  }, [feedMode]);

  const featured =
    getFeaturedStory(
      feedStories.length > 0 ? feedStories : stories,
      profile,
      feedMode === "personalized",
      userIntelligence
    ) ??
    feedStories[0] ??
    stories[0];
  const relevant = useMemo(() => {
    if (!profile || feedStories.length === 0) return [];
    if (feedMode === "personalized") {
      return selectRelevantStoriesForUser(
        feedStories,
        profile,
        userIntelligence,
        4
      );
    }
    return feedStories.slice(0, 4);
  }, [profile, feedStories, feedMode, userIntelligence]);
  const categoryFilteredPool = useMemo(
    () => filterStoriesByCategory(rankedFullPool, topCategory),
    [rankedFullPool, topCategory]
  );

  const topStoriesPool = useMemo(() => {
    if (feedMode === "personalized" && profile) {
      const ranked = selectTopStoriesForUser(
        categoryFilteredPool,
        profile,
        userIntelligence,
        12
      );
      return ranked.length > 0 ? ranked : categoryFilteredPool;
    }
    return categoryFilteredPool;
  }, [categoryFilteredPool, feedMode, profile, userIntelligence]);
  const topStories = topStoriesPool.slice(0, 6);

  const moreStoriesExcludeSlugs = useMemo(() => {
    const slugs = new Set<string>();
    if (featured) slugs.add(featured.slug);
    for (const story of relevant) slugs.add(story.slug);
    for (const story of topStories) slugs.add(story.slug);
    return slugs;
  }, [featured, relevant, topStories]);

  const moreStories = useMemo(() => {
    if (!profile || categoryFilteredPool.length === 0) return [];
    return selectMoreStoriesForFeed(
      categoryFilteredPool,
      moreStoriesExcludeSlugs,
      profile,
      userIntelligence,
      feedMode === "personalized"
    );
  }, [
    profile,
    categoryFilteredPool,
    moreStoriesExcludeSlugs,
    userIntelligence,
    feedMode,
  ]);

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
        cadence={cadence}
        onCadenceChange={handleCadenceChange}
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
                ? userIntelligence && userIntelligence.behaviorConfidence >= 0.35
                  ? `Ranked for you — ${userIntelligence.effectiveLens}`
                  : "Ranked for your career, interests, and focus"
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

      <SignalsDashboard
        stories={feedStories.length > 0 ? feedStories : stories}
        profile={profile}
        userIntelligence={userIntelligence}
        personalized={feedMode === "personalized"}
      />

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
        <CategoryEngagementTracker
          category={topCategory}
          storyCount={topStoriesPool.length}
        />
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

      <section className="space-y-5">
        <div>
          <h2 className="font-serif text-xl text-white sm:text-2xl">
            More Stories
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {feedMode === "personalized"
              ? "Ranked by strategic relevance — scroll to explore"
              : "Global desk — ranked by strategic significance"}
          </p>
        </div>
        <MoreStoriesFeed
          key={`${feedMode}-${topCategory}`}
          stories={moreStories}
          usePersonalizedBadges={usePersonalizedBadges}
        />
      </section>
    </div>
  );
}
