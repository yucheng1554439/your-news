import "server-only";

import { getStorySourceTier } from "@/lib/editorial/source-authority";
import {
  detectNarrativeTheme,
  extractEntities,
} from "@/lib/editorial/narrative-clusters";
import { ensureStoryArticleBody } from "@/lib/extraction/resolve-body";
import {
  findCorroboratingStoriesForIntelligence,
} from "@/lib/feed/corroborating-coverage";
import { getDisplayTags } from "@/lib/intelligence/story-tags";
import type { ClusterIntelligence, ClusterSource, Story } from "@/lib/types";

export type StoryIntelligenceMaterial = {
  anchor: Story;
  /** Anchor first, then same-event corroboration only — never the weekly corpus. */
  materialStories: Story[];
  cluster: ClusterIntelligence | null;
  corroboratingSlugs: string[];
};

function uniqueSources(stories: Story[]): ClusterSource[] {
  const seen = new Set<string>();
  const sources: ClusterSource[] = [];

  for (const story of stories) {
    const key = story.source.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({
      name: story.source,
      tier: getStorySourceTier(story),
      slug: story.slug,
      publishedAt: story.publishedAt,
      url: story.sourceUrl,
    });
  }

  return sources.sort((a, b) => a.tier - b.tier);
}

function buildCorroborationCluster(
  anchor: Story,
  corroborating: Story[]
): ClusterIntelligence {
  const stories = [anchor, ...corroborating];
  const entities = [
    ...new Set(stories.flatMap((s) => s.narrativeEntities ?? extractEntities(s))),
  ];
  const sources = uniqueSources(stories);
  const theme = anchor.narrativeTheme ?? detectNarrativeTheme(anchor);
  const importanceScore = anchor.importanceScore ?? 5;

  return {
    id: `story-event:${anchor.slug}`,
    theme,
    title: anchor.headline,
    summary: anchor.rawExcerpt ?? anchor.summary,
    sources,
    articleCount: stories.length,
    sourceCount: sources.length,
    importance: anchor.importance,
    importanceScore,
    importanceLabel: anchor.importanceLabel,
    tags: getDisplayTags(anchor, 6),
    entities,
    timeline: [],
    corroborationScore: Math.min(1, 0.25 + corroborating.length * 0.18),
    representativeSlug: anchor.slug,
    representative: anchor,
    stories,
  };
}

/**
 * Story intelligence input scope — current story plus same-event corroboration only.
 * Does not cluster the weekly corpus or reuse briefing intelligence maps.
 */
export async function resolveStoryIntelligenceMaterial(
  story: Story,
  pool: Story[]
): Promise<StoryIntelligenceMaterial> {
  const anchor = await ensureStoryArticleBody(story);
  const corroborating = findCorroboratingStoriesForIntelligence(anchor, pool, 6);

  if (corroborating.length === 0) {
    return {
      anchor,
      materialStories: [anchor],
      cluster: null,
      corroboratingSlugs: [],
    };
  }

  const materialStories = await Promise.all(
    [anchor, ...corroborating].map((s) => ensureStoryArticleBody(s))
  );

  return {
    anchor,
    materialStories,
    cluster: buildCorroborationCluster(anchor, corroborating),
    corroboratingSlugs: corroborating.map((s) => s.slug),
  };
}
