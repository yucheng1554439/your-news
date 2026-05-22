"use client";

import { useEffect, useState } from "react";
import { formatRelativeStoryDate } from "@/lib/format-story-date";
import { cn } from "@/lib/utils";

interface StoryDateProps {
  publishedAt: string;
  className?: string;
}

/** Refreshes relative time labels so the feed feels continuously updated. */
export function StoryDate({ publishedAt, className }: StoryDateProps) {
  const [label, setLabel] = useState(() =>
    formatRelativeStoryDate(publishedAt)
  );

  useEffect(() => {
    const refresh = () => setLabel(formatRelativeStoryDate(publishedAt));
    refresh();
    const id = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(id);
  }, [publishedAt]);

  if (!label) return null;

  return <span className={cn(className)}>{label}</span>;
}
