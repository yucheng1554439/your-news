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
import { StoryDate } from "@/components/StoryDate";
import { getRelatedStories, getStoryBySlug } from "@/lib/data/stories";
import { isCriticalForDisplay } from "@/lib/importance-scoring";
import { isCriticalForUser } from "@/lib/personalization/importance";
import { signalsFromProfile } from "@/lib/personalization/signals";

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
  const signals = profile ? signalsFromProfile(profile) : null;
  const showCritical =
    signals && profile?.completed
      ? isCriticalForUser(story, signals)
      : isCriticalForDisplay(story);

  return (
    <div className="min-h-screen bg-zinc-950">
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
        </header>

        <StoryIntelligenceAsync story={story} profile={profile} />

        <ReadOriginalSource
          sourceUrl={story.sourceUrl}
          sourceName={story.source}
        />

        {story.timeline && story.timeline.length > 0 && (
          <section className="mt-10 space-y-6">
            <h2 className="font-serif text-xl text-white">Timeline</h2>
            <ol className="relative space-y-6 border-l border-white/10 pl-6">
              {story.timeline.map((event, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[1.4rem] top-1.5 h-2 w-2 rounded-full bg-zinc-600" />
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    {event.date}
                  </p>
                  <p className="mt-1 text-zinc-300">{event.event}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

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
