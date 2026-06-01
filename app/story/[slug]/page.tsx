import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { StoryCard } from "@/components/StoryCard";
import { StoryImage } from "@/components/StoryImage";
import { SaveStoryButton } from "@/components/SaveStoryButton";
import { StoryIntelligenceAsync } from "@/components/StoryIntelligenceAsync";
import { ReadOriginalSource } from "@/components/ReadOriginalSource";
import { getCategoryLabel } from "@/lib/data/categories";
import { getOnboardingFromClerk } from "@/app/actions/onboarding";
import { getSavedStoriesFromClerk } from "@/app/actions/saved-stories";
import { getReadingSignalsFromClerk } from "@/app/actions/reading-signals";
import { StoryDate } from "@/components/StoryDate";
import { getRelatedStories, getStoryBySlug } from "@/lib/data/stories";
import { isCriticalForDisplay } from "@/lib/importance-scoring";
import { isCriticalForUser } from "@/lib/personalization/importance";
import { behaviorSignalsFromReading } from "@/lib/personalization/behavior-signals";
import { signalsFromProfile } from "@/lib/personalization/signals";
import { RecordStoryOpen } from "@/components/RecordStoryOpen";
import { getDisplayTags } from "@/lib/intelligence/story-tags";

interface StoryPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export default async function StoryPage({ params }: StoryPageProps) {
  const { slug } = await params;
  const profile = await getOnboardingFromClerk();
  const story = await getStoryBySlug(slug, { profile, enrich: false });

  if (!story) {
    notFound();
  }

  const related = await getRelatedStories(slug, 4, { profile, enrich: false });
  const savedRefs =
    profile?.completed ? await getSavedStoriesFromClerk() : [];
  const reading =
    profile?.completed ? await getReadingSignalsFromClerk() : null;
  const signals = profile
    ? signalsFromProfile(
        profile,
        behaviorSignalsFromReading(reading, savedRefs)
      )
    : null;
  const showCritical =
    signals && profile?.completed
      ? isCriticalForUser(story, signals)
      : isCriticalForDisplay(story);
  const storyTags = getDisplayTags(story, 6);

  return (
    <div className="min-h-screen bg-zinc-950">
      <RecordStoryOpen story={story} />
      <Navbar />
      <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-2xl border border-white/10">
          <StoryImage
            src={story.imageUrl}
            alt=""
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
          <div className="absolute right-4 top-4 z-10 sm:right-5 sm:top-5">
            <SaveStoryButton story={story} size="md" />
          </div>
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4 pr-16 sm:p-5 sm:pr-20">
            <span className="rounded-full border border-white/10 bg-zinc-950/60 px-3 py-1 text-xs text-zinc-300 backdrop-blur-md">
              {getCategoryLabel(story.category)}
            </span>
            <StoryDate
              publishedAt={story.publishedAt}
              className="rounded-full border border-white/10 bg-zinc-950/60 px-3 py-1 text-xs text-zinc-400 backdrop-blur-md"
            />
          </div>
        </div>

        <header className="space-y-4">
          {showCritical && (
            <span className="inline-block rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white">
              Critical
            </span>
          )}
          <h1 className="font-serif text-3xl leading-tight text-white sm:text-4xl md:text-5xl">
            {story.headline}
          </h1>
          <p className="text-sm text-zinc-500">
            {story.source}
            {story.readTime > 0 && ` · ${story.readTime} min read`}
          </p>
          {storyTags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {storyTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-zinc-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        <StoryIntelligenceAsync story={story} profile={profile} />

        <ReadOriginalSource
          sourceUrl={story.sourceUrl}
          sourceName={story.source}
        />

        <section className="mt-14">
          <h2 className="mb-6 font-serif text-2xl text-white">
            Related Coverage
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {related.map((s) => (
              <StoryCard key={s.slug} story={s} variant="compact" />
            ))}
          </div>
        </section>

        <div className="mt-12">
          <Link
            href="/"
            className="text-sm text-zinc-400 transition-colors hover:text-white"
          >
            ← Back to briefing
          </Link>
        </div>
      </article>
    </div>
  );
}
