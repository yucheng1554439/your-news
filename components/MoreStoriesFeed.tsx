"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StoryCard } from "@/components/StoryCard";
import type { Story } from "@/lib/types";

const PAGE_SIZE = 20;

interface MoreStoriesFeedProps {
  stories: Story[];
  usePersonalizedBadges?: boolean;
}

export function MoreStoriesFeed({
  stories,
  usePersonalizedBadges = false,
}: MoreStoriesFeedProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [stories]);

  const loadMore = useCallback(() => {
    setVisibleCount((current) =>
      Math.min(current + PAGE_SIZE, stories.length)
    );
  }, [stories.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visibleCount >= stories.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "320px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, stories.length, loadMore]);

  if (stories.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No additional stories in this category. Try another filter or check
        back after the next refresh.
      </p>
    );
  }

  const visibleStories = stories.slice(0, visibleCount);
  const hasMore = visibleCount < stories.length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleStories.map((story) => (
          <StoryCard
            key={story.slug}
            story={story}
            usePersonalizedImportance={usePersonalizedBadges}
          />
        ))}
      </div>
      {hasMore && (
        <>
          <div ref={sentinelRef} className="h-1" aria-hidden />
          <p className="text-center text-xs text-zinc-500">
            Scroll for more stories
          </p>
        </>
      )}
    </div>
  );
}
