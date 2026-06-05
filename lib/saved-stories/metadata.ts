import type { Story, StoryCategory } from "@/lib/types";

export const SAVED_STORIES_METADATA_KEY = "savedStories";
export const MAX_SAVED_STORIES = 80;
export const SAVED_SNAPSHOT_VERSION = 2;

/** Permanent saved story snapshot — independent of live feed rotation. */
export type SavedStorySnapshot = {
  slug: string;
  headline: string;
  imageUrl: string;
  source: string;
  publishedAt: string;
  category: StoryCategory;
  savedAt: number;
  snapshotVersion: number;
  summary: string;
  whyItMatters: string;
  whyItMattersToYou?: string;
  nextWatch?: string;
  tags: string[];
  strategicTags?: string[];
  secondaryTags?: string[];
  sourceUrl?: string;
  articleBody?: string;
  intelligenceGeneratedBy?: Story["intelligenceGeneratedBy"];
  signalSummaryDisclaimer?: string;
  paywallDetected?: boolean;
  /** Legacy ref could not be rehydrated from live corpus — metadata preserved. */
  needsRehydration?: boolean;
};

/** @deprecated Use SavedStorySnapshot */
export type SavedStoryRef = SavedStorySnapshot;

export type SavedStoriesMetadata = {
  items: SavedStorySnapshot[];
  updatedAt: number;
};

export function isLegacySavedRef(item: SavedStorySnapshot): boolean {
  return (
    item.snapshotVersion !== SAVED_SNAPSHOT_VERSION ||
    !item.summary?.trim()
  );
}

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
    snapshotVersion: SAVED_SNAPSHOT_VERSION,
    summary: story.summary?.trim() || story.headline,
    whyItMatters: story.whyItMatters?.trim() ?? "",
    whyItMattersToYou: story.whyItMattersToYou?.trim() || undefined,
    nextWatch: story.nextWatch?.trim() || undefined,
    tags: story.tags?.length ? story.tags : [story.category],
    strategicTags: story.strategicTags,
    secondaryTags: story.secondaryTags,
    sourceUrl: story.sourceUrl,
    articleBody: story.articleBody,
    intelligenceGeneratedBy: story.intelligenceGeneratedBy,
    signalSummaryDisclaimer: story.signalSummaryDisclaimer,
    paywallDetected: story.paywallDetected,
    needsRehydration: false,
  };
}

/** @deprecated Use storyToSavedSnapshot */
export function storyToSavedRef(story: Story): SavedStorySnapshot {
  return storyToSavedSnapshot(story);
}

function normalizeSnapshot(raw: unknown): SavedStorySnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.slug !== "string" || typeof o.headline !== "string") return null;

  const category = (typeof o.category === "string"
    ? o.category
    : "technology") as StoryCategory;

  const savedAt = typeof o.savedAt === "number" ? o.savedAt : Date.now();

  return {
    slug: o.slug,
    headline: o.headline,
    imageUrl: typeof o.imageUrl === "string" ? o.imageUrl : "",
    source: typeof o.source === "string" ? o.source : "",
    publishedAt: typeof o.publishedAt === "string" ? o.publishedAt : "",
    category,
    savedAt,
    snapshotVersion:
      typeof o.snapshotVersion === "number"
        ? o.snapshotVersion
        : 1,
    summary:
      typeof o.summary === "string" && o.summary.trim()
        ? o.summary
        : "",
    whyItMatters:
      typeof o.whyItMatters === "string" ? o.whyItMatters : "",
    whyItMattersToYou:
      typeof o.whyItMattersToYou === "string"
        ? o.whyItMattersToYou
        : undefined,
    nextWatch: typeof o.nextWatch === "string" ? o.nextWatch : undefined,
    tags: Array.isArray(o.tags)
      ? o.tags.filter((t): t is string => typeof t === "string")
      : [category],
    strategicTags: Array.isArray(o.strategicTags)
      ? o.strategicTags.filter((t): t is string => typeof t === "string")
      : undefined,
    secondaryTags: Array.isArray(o.secondaryTags)
      ? o.secondaryTags.filter((t): t is string => typeof t === "string")
      : undefined,
    sourceUrl: typeof o.sourceUrl === "string" ? o.sourceUrl : undefined,
    articleBody: typeof o.articleBody === "string" ? o.articleBody : undefined,
    intelligenceGeneratedBy: o.intelligenceGeneratedBy as
      | SavedStorySnapshot["intelligenceGeneratedBy"]
      | undefined,
    signalSummaryDisclaimer:
      typeof o.signalSummaryDisclaimer === "string"
        ? o.signalSummaryDisclaimer
        : undefined,
    paywallDetected:
      typeof o.paywallDetected === "boolean" ? o.paywallDetected : undefined,
    needsRehydration:
      typeof o.needsRehydration === "boolean" ? o.needsRehydration : undefined,
  };
}

export function parseSavedStoriesFromMetadata(
  metadata: Record<string, unknown> | undefined | null
): SavedStoriesMetadata {
  const raw = metadata?.[SAVED_STORIES_METADATA_KEY];
  if (!raw || typeof raw !== "object") {
    return { items: [], updatedAt: 0 };
  }

  const obj = raw as { items?: unknown; updatedAt?: unknown };
  const items = Array.isArray(obj.items)
    ? obj.items
        .map(normalizeSnapshot)
        .filter((item): item is SavedStorySnapshot => item !== null)
        .slice(0, MAX_SAVED_STORIES)
    : [];

  return {
    items,
    updatedAt: typeof obj.updatedAt === "number" ? obj.updatedAt : 0,
  };
}

export function isSlugSaved(
  metadata: SavedStoriesMetadata,
  slug: string
): boolean {
  return metadata.items.some((item) => item.slug === slug);
}

export function getSavedSnapshotBySlug(
  items: SavedStorySnapshot[],
  slug: string
): SavedStorySnapshot | undefined {
  return items.find((item) => item.slug === slug);
}
