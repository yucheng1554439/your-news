"use client";

import { AIStatusBanner } from "@/components/AIStatusBanner";
import { StoryIntelligence } from "@/components/StoryIntelligence";
import type { OnboardingProfile, Story } from "@/lib/types";

interface StoryIntelligenceAsyncProps {
  story: Story;
  profile: OnboardingProfile | null;
}

export function StoryIntelligenceAsync({
  story,
}: StoryIntelligenceAsyncProps) {
  const hasAi = Boolean(story.intelligenceGeneratedBy);

  return (
    <>
      <AIStatusBanner
        generatedBy={story.intelligenceGeneratedBy}
        aiError={story.intelligenceAiError ?? story.intelligenceOpenaiError}
        context="story"
      />
      {hasAi ? (
        <StoryIntelligence
          story={story}
          whyItMattersToYou={story.whyItMattersToYou}
        />
      ) : (
        <div className="mt-10 space-y-4 rounded-xl border border-white/10 bg-zinc-900/40 px-5 py-6">
          <p className="text-sm leading-relaxed text-zinc-300">{story.summary}</p>
          {story.whyItMatters ? (
            <p className="text-sm leading-relaxed text-zinc-400">
              {story.whyItMatters}
            </p>
          ) : null}
          <p className="text-xs text-zinc-500">
            AI intelligence for this story is not in the snapshot yet. Use{" "}
            <span className="text-zinc-400">Refresh Intelligence</span> on the
            homepage to generate and persist analysis.
          </p>
        </div>
      )}
    </>
  );
}
