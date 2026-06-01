"use client";

import Link from "next/link";
import { StoryImage } from "@/components/StoryImage";
import { SaveStoryButton } from "@/components/SaveStoryButton";
import { motion } from "framer-motion";
import { getCategoryLabel } from "@/lib/data/categories";
import { getDisplayTags } from "@/lib/intelligence/story-tags";
import { StoryDate } from "@/components/StoryDate";
import { isCriticalForDisplay } from "@/lib/importance-scoring";
import type { Story } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StoryCardProps {
  story: Story;
  variant?: "default" | "featured" | "compact";
  className?: string;
  usePersonalizedImportance?: boolean;
}

export function StoryCard({
  story,
  variant = "default",
  className,
  usePersonalizedImportance = false,
}: StoryCardProps) {
  const isFeatured = variant === "featured";
  const isCompact = variant === "compact";
  const showCritical = usePersonalizedImportance
    ? story.personalizedImportanceLabel === "Critical"
    : isCriticalForDisplay(story);
  const displayTags = getDisplayTags(story, 3);

  return (
    <motion.article
      whileHover={{ y: isFeatured ? -3 : -2 }}
      transition={{ duration: 0.2 }}
      className={cn("group relative", className)}
    >
      <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4">
        <SaveStoryButton story={story} size={isFeatured ? "md" : "sm"} />
      </div>

      <Link
        href={`/story/${encodeURIComponent(story.slug)}`}
        className={cn(
          "relative block overflow-hidden rounded-xl border bg-zinc-900",
          isFeatured
            ? "aspect-[16/9] border-white/15 sm:aspect-[21/9] sm:rounded-2xl"
            : isCompact
              ? "aspect-[4/3] border-white/10"
              : "aspect-[3/2] border-white/10"
        )}
      >
        <StoryImage
          src={story.imageUrl}
          alt=""
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          sizes={isFeatured ? "(max-width: 768px) 100vw, 1200px" : "(max-width: 768px) 50vw, 400px"}
        />
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-t from-zinc-950",
            isFeatured
              ? "via-zinc-950/75 to-zinc-950/20"
              : "via-zinc-950/60 to-transparent"
          )}
        />

        <div
          className={cn(
            "absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4 pr-14",
            isFeatured && "p-5 pr-16 sm:p-6 sm:pr-20"
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full border border-white/10 bg-zinc-950/60 px-2.5 py-0.5 text-[11px] text-zinc-300 backdrop-blur-md",
                isFeatured && "text-xs"
              )}
            >
              {getCategoryLabel(story.category)}
            </span>
            {showCritical && (
              <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-md">
                Critical
              </span>
            )}
            {displayTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-zinc-950/50 px-2 py-0.5 text-[10px] text-zinc-400 backdrop-blur-md"
              >
                {tag}
              </span>
            ))}
          </div>
          <StoryDate
            publishedAt={story.publishedAt}
            className={cn(
              "shrink-0 rounded-full border border-white/10 bg-zinc-950/60 px-2.5 py-0.5 text-[11px] text-zinc-400 backdrop-blur-md",
              isFeatured && "text-xs text-zinc-300"
            )}
          />
        </div>

        <div
          className={cn(
            "absolute inset-x-0 bottom-0",
            isFeatured ? "p-6 sm:p-8 md:p-10" : "p-4 sm:p-5"
          )}
        >
          <h3
            className={cn(
              "font-serif leading-snug text-white",
              isFeatured
                ? "text-2xl sm:text-4xl md:text-5xl md:leading-[1.1]"
                : isCompact
                  ? "text-base sm:text-lg"
                  : "text-lg sm:text-xl"
            )}
          >
            {story.headline}
          </h3>
          {isFeatured && (
            <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              {story.summary}
            </p>
          )}
          {!isFeatured && !isCompact && (
            <p className="mt-2 line-clamp-2 text-sm text-zinc-500">
              {story.summary}
            </p>
          )}
        </div>
      </Link>
    </motion.article>
  );
}
