"use client";

import { useEffect, useRef } from "react";
import {
  recordCategoryClickForUser,
  recordCategoryIgnoreForUser,
} from "@/app/actions/reading-signals";
import type { TopStoryCategory } from "@/lib/feed/category-filter";

type CategoryEngagementTrackerProps = {
  category: TopStoryCategory;
  storyCount: number;
};

/**
 * Records category filter clicks; marks ignore when user bounces from empty/low-interest filter.
 */
export function CategoryEngagementTracker({
  category,
  storyCount,
}: CategoryEngagementTrackerProps) {
  const prev = useRef<TopStoryCategory>(category);
  const clickedAt = useRef<number>(0);

  useEffect(() => {
    if (prev.current === category) return;

    void recordCategoryClickForUser(category);
    clickedAt.current = Date.now();
    prev.current = category;

    if (category === "all") return;

    const timer = window.setTimeout(() => {
      if (storyCount === 0) {
        void recordCategoryIgnoreForUser(category);
      }
    }, 12_000);

    return () => window.clearTimeout(timer);
  }, [category, storyCount]);

  return null;
}
