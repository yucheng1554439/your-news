import "server-only";

import {
  findClusterForStory,
  MAX_CLUSTER_INTELLIGENCE_STORIES,
} from "@/lib/editorial/cluster-intelligence";
import { ensureStoryArticleBody } from "@/lib/extraction/resolve-body";
import type { ClusterIntelligence, Story } from "@/lib/types";

export type StoryClusterContext = {
  cluster: ClusterIntelligence | null;
  /** Stories passed to the model (representative first, then corroboration). */
  materialStories: Story[];
};

export async function resolveStoryClusterContext(
  story: Story,
  corpus: Story[]
): Promise<StoryClusterContext> {
  const cluster = findClusterForStory(story, corpus);
  if (!cluster || cluster.articleCount <= 1) {
    const withBody = await ensureStoryArticleBody(story);
    return { cluster: null, materialStories: [withBody] };
  }

  const ordered = [
    cluster.representative,
    ...cluster.stories.filter((s) => s.slug !== cluster.representativeSlug),
  ].slice(0, MAX_CLUSTER_INTELLIGENCE_STORIES);

  const materialStories = await Promise.all(
    ordered.map((s) => ensureStoryArticleBody(s))
  );

  return { cluster, materialStories };
}

export function clusterIntelligenceFingerprint(
  cluster: ClusterIntelligence,
  materialStories: Story[]
): string {
  const slugs = materialStories
    .map((s) => s.slug)
    .sort()
    .join(",");
  const bodies = materialStories
    .map((s) => (s.articleBody ?? s.rawExcerpt ?? "").slice(0, 80))
    .join("|");
  return `cluster:${cluster.id}|n=${cluster.articleCount}|${slugs}|${bodies}`;
}
