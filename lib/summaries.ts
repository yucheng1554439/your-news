import "server-only";

import {
  enrichStoryWithIntelligence,
  resolveStoryIntelligence,
} from "@/lib/intelligence/engine";
import type { StoryIntelligencePackage } from "@/lib/intelligence/types";
import type { OnboardingProfile, Story } from "@/lib/types";

const ENRICH_CONCURRENCY = 3;

export type { StoryIntelligencePackage };

export { resolveStoryIntelligence, enrichStoryWithIntelligence };

async function enrichWithConcurrency(
  stories: Story[],
  limit: number,
  profile: OnboardingProfile | null
): Promise<Story[]> {
  const output: Story[] = [];
  let index = 0;

  async function worker() {
    while (index < stories.length) {
      const i = index++;
      output[i] = await enrichStoryWithIntelligence(stories[i], profile);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, stories.length) },
    () => worker()
  );
  await Promise.all(workers);
  return output;
}

export async function enrichStories(
  stories: Story[],
  options?: {
    limit?: number;
    profile?: OnboardingProfile | null;
  }
): Promise<Story[]> {
  const limit = options?.limit ?? 6;
  if (stories.length === 0) return stories;

  const toEnrich = stories.slice(0, limit);
  const rest = stories.slice(limit);

  const enriched = await enrichWithConcurrency(
    toEnrich,
    ENRICH_CONCURRENCY,
    options?.profile ?? null
  );
  return [...enriched, ...rest];
}

export async function enrichStory(
  story: Story,
  profile?: OnboardingProfile | null
): Promise<Story> {
  return enrichStoryWithIntelligence(story, profile ?? null);
}
