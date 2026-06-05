import type { SavedStorySnapshot } from "@/lib/saved-stories/metadata";
import type { Story } from "@/lib/types";

/** Render a permanent saved snapshot as a live Story shape. */
export function snapshotToStory(snapshot: SavedStorySnapshot): Story {
  return {
    slug: snapshot.slug,
    headline: snapshot.headline,
    summary: snapshot.summary?.trim() || snapshot.headline,
    whyItMatters: snapshot.whyItMatters ?? "",
    whyItMattersToYou: snapshot.whyItMattersToYou,
    nextWatch: snapshot.nextWatch,
    category: snapshot.category,
    tags: snapshot.tags?.length ? snapshot.tags : [snapshot.category],
    strategicTags: snapshot.strategicTags,
    secondaryTags: snapshot.secondaryTags,
    imageUrl: snapshot.imageUrl,
    publishedAt: snapshot.publishedAt,
    source: snapshot.source,
    sourceUrl: snapshot.sourceUrl,
    articleBody: snapshot.articleBody,
    paywallDetected: snapshot.paywallDetected,
    signalSummaryDisclaimer: snapshot.signalSummaryDisclaimer,
    intelligenceGeneratedBy: snapshot.intelligenceGeneratedBy,
    importance: "medium",
    readTime: 5,
  };
}

export function resolveSavedStories(
  saved: SavedStorySnapshot[],
  liveStories: Story[]
): Story[] {
  const liveBySlug = new Map(liveStories.map((s) => [s.slug, s]));

  return saved.map((snapshot) => {
    if (!snapshot.summary?.trim()) {
      const live = liveBySlug.get(snapshot.slug);
      if (live) return live;
    }
    return snapshotToStory(snapshot);
  });
}
