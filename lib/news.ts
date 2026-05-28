import "server-only";

/**
 * @deprecated News ingest lives in `lib/news/ingest.ts` and `lib/news/story-pool.ts`.
 * Use `getStoryPool()` from `@/lib/news/story-pool` — do not call fetchLiveStories from pages.
 */
import { ingestStoriesFromNewsApi } from "@/lib/news/ingest";
import type { Story } from "@/lib/types";

export type LiveNewsResult = {
  stories: Story[];
  error: string | null;
};

/** @deprecated Use getStoryPool() — kept for legacy imports only. */
export async function fetchLiveStories(): Promise<LiveNewsResult> {
  const result = await ingestStoriesFromNewsApi();
  return { stories: result.stories, error: result.error };
}

export { ingestStoriesFromNewsApi } from "@/lib/news/ingest";
export {
  getStoryPool,
  invalidateStoryPool,
  type StoryPoolSnapshot,
  type StoryPoolStatus,
} from "@/lib/news/story-pool";
