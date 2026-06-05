"use client";

import { useEffect, useState } from "react";
import {
  fetchStoryIntelligence,
  generateStoryIntelligenceIfMissing,
} from "@/app/actions/intelligence";
import { StoryIntelligence } from "@/components/StoryIntelligence";
import { hasDisplayableIntelligence } from "@/lib/intelligence/display";
import { verifyIntelligenceMatch } from "@/lib/intelligence/provenance-match";
import type { OnboardingProfile, Story } from "@/lib/types";

interface StoryIntelligenceAsyncProps {
  story: Story;
  profile: OnboardingProfile | null;
}

const MAX_POLLS = 4;

function GeneratingStoryIntelligence({ story }: { story: Story }) {
  const excerpt = story.rawExcerpt?.trim() || story.summary?.trim();
  return (
    <div className="mt-10 space-y-6 rounded-xl border border-white/10 bg-zinc-900/40 px-5 py-8">
      <div className="flex items-center gap-3">
        <span
          className="h-2 w-2 animate-pulse rounded-full bg-emerald-400/90"
          aria-hidden
        />
        <p className="text-sm font-medium text-zinc-200">
          Preparing analysis…
        </p>
      </div>
      {excerpt && (
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-[0.15em] text-zinc-500">
            From the source
          </h2>
          <p className="text-sm leading-relaxed text-zinc-400">{excerpt}</p>
        </section>
      )}
    </div>
  );
}

function isStoryIntelligenceReady(base: Story, candidate: Story): boolean {
  return (
    hasDisplayableIntelligence(candidate) &&
    verifyIntelligenceMatch(base, candidate).match
  );
}

export function StoryIntelligenceAsync({
  story: initial,
  profile,
}: StoryIntelligenceAsyncProps) {
  const [story, setStory] = useState(initial);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setStory(initial);
    setLoading(true);
  }, [initial.slug, initial.intelligenceGeneratedBy]);

  const ready = isStoryIntelligenceReady(initial, story);

  useEffect(() => {
    if (ready) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let localPolls = 0;
    let requestedBackfill = false;

    async function tick() {
      if (cancelled) return;
      localPolls += 1;

      const next = await fetchStoryIntelligence(initial.slug, profile);
      if (next && isStoryIntelligenceReady(initial, next)) {
        setStory(next);
        setLoading(false);
        return;
      }

      if (!requestedBackfill && localPolls >= 2) {
        requestedBackfill = true;
        const gen = await generateStoryIntelligenceIfMissing(
          initial.slug,
          profile
        );
        if (gen.ok && gen.story && isStoryIntelligenceReady(initial, gen.story)) {
          setStory(gen.story);
          setLoading(false);
          return;
        }
        if (gen.story && hasDisplayableIntelligence(gen.story)) {
          setStory(gen.story);
          setLoading(false);
          return;
        }
      }

      if (localPolls >= MAX_POLLS) {
        const fallback = await fetchStoryIntelligence(initial.slug, profile);
        if (fallback && hasDisplayableIntelligence(fallback)) {
          setStory(fallback);
        }
        setLoading(false);
      }
    }

    void tick();
    const interval = setInterval(() => void tick(), 2500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [initial.slug, profile, ready]);

  if (ready || (hasDisplayableIntelligence(story) && !loading)) {
    return (
      <StoryIntelligence
        story={story}
        whyItMattersToYou={story.whyItMattersToYou}
      />
    );
  }

  if (loading) {
    return <GeneratingStoryIntelligence story={story} />;
  }

  return (
    <StoryIntelligence
      story={story}
      whyItMattersToYou={story.whyItMattersToYou}
    />
  );
}
