"use client";

import { useEffect, useRef } from "react";
import {
  recordStoryDwellForUser,
  recordStoryOpenForUser,
} from "@/app/actions/reading-signals";
import type { Story } from "@/lib/types";

type RecordStoryOpenProps = {
  story: Pick<Story, "slug" | "category" | "tags">;
};

/** Fire-and-forget open + dwell signals for behavioral personalization. */
export function RecordStoryOpen({ story }: RecordStoryOpenProps) {
  const sent = useRef(false);
  const openedAt = useRef<number | null>(null);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    openedAt.current = Date.now();
    void recordStoryOpenForUser(story);
  }, [story.slug, story.category, story.tags]);

  useEffect(() => {
    const flushDwell = () => {
      if (!openedAt.current) return;
      const dwellMs = Date.now() - openedAt.current;
      if (dwellMs >= 3000) {
        void recordStoryDwellForUser(story.slug, dwellMs);
      }
    };

    const onHide = () => {
      if (document.visibilityState === "hidden") flushDwell();
    };

    window.addEventListener("pagehide", flushDwell);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      flushDwell();
      window.removeEventListener("pagehide", flushDwell);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [story.slug]);

  return null;
}
