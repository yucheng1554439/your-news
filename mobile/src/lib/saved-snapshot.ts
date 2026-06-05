import type { SavedStorySnapshot } from "@/types/saved";
import type { Story, StoryCategory } from "@/types";

export function storyToSavedSnapshot(
  story: Story,
  savedAt = Date.now()
): SavedStorySnapshot {
  return {
    slug: story.slug,
    headline: story.headline,
    imageUrl: story.imageUrl,
    source: story.source,
    publishedAt: story.publishedAt,
    category: story.category,
    savedAt,
    snapshotVersion: 2,
    summary: story.summary?.trim() || story.headline,
    whyItMatters: story.whyItMatters?.trim() ?? "",
    whyItMattersToYou: story.whyItMattersToYou?.trim() || undefined,
    nextWatch: story.nextWatch?.trim() || undefined,
    tags: story.tags?.length ? story.tags : [story.category],
    strategicTags: story.strategicTags,
    secondaryTags: story.secondaryTags,
    sourceUrl: story.sourceUrl,
    intelligenceGeneratedBy: story.intelligenceGeneratedBy,
    signalSummaryDisclaimer: story.signalSummaryDisclaimer,
    paywallDetected: story.paywallDetected,
    needsRehydration: false,
  };
}

export function snapshotToStory(snapshot: SavedStorySnapshot): Story {
  return {
    slug: snapshot.slug,
    headline: snapshot.headline,
    summary: snapshot.summary?.trim() || snapshot.headline,
    whyItMatters: snapshot.whyItMatters ?? "",
    whyItMattersToYou: snapshot.whyItMattersToYou,
    nextWatch: snapshot.nextWatch,
    category: snapshot.category as StoryCategory,
    tags: snapshot.tags?.length ? snapshot.tags : [snapshot.category as StoryCategory],
    strategicTags: snapshot.strategicTags,
    secondaryTags: snapshot.secondaryTags,
    imageUrl: snapshot.imageUrl,
    publishedAt: snapshot.publishedAt,
    source: snapshot.source,
    sourceUrl: snapshot.sourceUrl,
    paywallDetected: snapshot.paywallDetected,
    signalSummaryDisclaimer: snapshot.signalSummaryDisclaimer,
    intelligenceGeneratedBy: snapshot.intelligenceGeneratedBy,
    readTime: 5,
  };
}

export function formatSavedDate(savedAt: number): string {
  return `Saved ${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(savedAt))}`;
}

export function getSavedSnapshotBySlug(
  items: SavedStorySnapshot[] | undefined,
  slug: string
): SavedStorySnapshot | undefined {
  return items?.find((item) => item.slug === slug);
}
