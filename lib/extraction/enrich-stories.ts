import "server-only";

import { ensureStoryArticleBody } from "@/lib/extraction/resolve-body";
import type { Story } from "@/lib/types";

const DEFAULT_CONCURRENCY = 4;

export type EnrichBodiesOptions = {
  /** Max stories to fetch full text for (by order in array — caller should pre-sort). */
  limit?: number;
  concurrency?: number;
};

/**
 * Fetches and attaches full article bodies for intelligence generation.
 */
export async function enrichStoriesWithArticleBodies(
  stories: Story[],
  options?: EnrichBodiesOptions
): Promise<Story[]> {
  const limit = options?.limit ?? stories.length;
  const concurrency = options?.concurrency ?? DEFAULT_CONCURRENCY;
  const targets = stories.slice(0, limit);
  const rest = stories.slice(limit);

  const output: Story[] = new Array(targets.length);
  let index = 0;

  async function worker() {
    while (index < targets.length) {
      const i = index++;
      output[i] = await ensureStoryArticleBody(targets[i]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, targets.length) }, () =>
      worker()
    )
  );

  return [...output, ...rest];
}
