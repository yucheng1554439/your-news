import Link from "next/link";
import { StoryCard } from "@/components/StoryCard";
import type { Story } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FeedSectionProps {
  title: string;
  subtitle?: string;
  stories: Story[];
  viewAllHref?: string;
  featuredFirst?: boolean;
  className?: string;
}

export function FeedSection({
  title,
  subtitle,
  stories,
  viewAllHref,
  featuredFirst = false,
  className,
}: FeedSectionProps) {
  if (stories.length === 0) return null;

  const [first, ...rest] = stories;

  return (
    <section className={cn("space-y-5", className)}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl text-white sm:text-2xl">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
          )}
        </div>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="shrink-0 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            View all
          </Link>
        )}
      </div>

      {featuredFirst ? (
        <div className="space-y-4">
          <StoryCard story={first} variant="featured" />
          {rest.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((story) => (
                <StoryCard key={story.slug} story={story} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <StoryCard key={story.slug} story={story} />
          ))}
        </div>
      )}
    </section>
  );
}
