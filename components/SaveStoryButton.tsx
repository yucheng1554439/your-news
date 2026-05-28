"use client";

import { Bookmark } from "lucide-react";
import { useSavedStories } from "@/hooks/use-saved-stories";
import type { Story } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SaveStoryButtonProps {
  story: Story;
  className?: string;
  size?: "sm" | "md";
}

export function SaveStoryButton({
  story,
  className,
  size = "sm",
}: SaveStoryButtonProps) {
  const { isSaved, toggle, isAuthenticated } = useSavedStories();
  const saved = isSaved(story.slug);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) return;
    void toggle(story);
  };

  const iconSize = size === "md" ? "h-5 w-5" : "h-4 w-4";
  const pad = size === "md" ? "p-2.5" : "p-2";

  return (
    <button
      type="button"
      aria-label={saved ? "Remove from saved" : "Save story"}
      aria-pressed={saved}
      title={
        isAuthenticated
          ? saved
            ? "Saved"
            : "Save for later"
          : "Sign in to save"
      }
      disabled={!isAuthenticated}
      onClick={handleClick}
      className={cn(
        "rounded-full border border-white/10 bg-zinc-950/70 text-zinc-300 backdrop-blur-md transition-colors",
        "hover:border-white/20 hover:bg-zinc-950/90 hover:text-white",
        "disabled:cursor-not-allowed disabled:opacity-50",
        saved && "border-amber-500/30 bg-amber-950/40 text-amber-200",
        pad,
        className
      )}
    >
      <Bookmark
        className={cn(iconSize, saved && "fill-current")}
        strokeWidth={1.75}
      />
    </button>
  );
}
