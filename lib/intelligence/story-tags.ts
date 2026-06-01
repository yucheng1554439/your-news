import { buildMultiTagProfile } from "@/lib/intelligence/multi-tag/engine";
import { tagDisplayLabel } from "@/lib/personalization/tag-labels";
import type { Story, StoryCategory } from "@/lib/types";

/** Apply multi-tag model to a story (idempotent). */
export function enrichStoryTags(story: Story): Story {
  const profile = buildMultiTagProfile({
    headline: story.headline,
    excerpt: story.rawExcerpt ?? story.summary,
    body: story.articleBody,
    fallbackCategory: story.primaryCategory ?? story.category,
  });

  return {
    ...story,
    category: profile.primaryCategory,
    primaryCategory: profile.primaryCategory,
    secondaryTags: profile.secondaryTags,
    strategicTags: profile.strategicTags,
    tags: profile.allTags,
    narrativeEntities: [
      ...new Set([...(story.narrativeEntities ?? []), ...profile.entityIds]),
    ],
  };
}

export function enrichStoryTagsBatch(stories: Story[]): Story[] {
  return stories.map(enrichStoryTags);
}

/** All tag strings used for matching (strategic + secondary + primary). */
export function getAllStoryTags(story: Story): string[] {
  const primary = story.primaryCategory ?? story.category;
  const strategic = story.strategicTags ?? [];
  const secondary = story.secondaryTags ?? [];
  const legacy = story.tags ?? [];
  return [...new Set([primary, ...strategic, ...secondary, ...legacy])];
}

/** Normalized keys for overlap (lowercase, hyphenated). */
export function getStoryTagKeys(story: Story): Set<string> {
  return new Set(
    getAllStoryTags(story).map((t) =>
      t
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
    )
  );
}

export function storyMatchesTag(
  story: Story,
  tag: string
): boolean {
  const needle = tag.toLowerCase().replace(/\s+/g, "-");
  const keys = getStoryTagKeys(story);
  if (keys.has(needle)) return true;

  const display = tagDisplayLabel(tag).toLowerCase();
  for (const key of keys) {
    if (key.includes(needle) || needle.includes(key)) return true;
  }
  for (const sec of story.secondaryTags ?? []) {
    if (sec.toLowerCase() === display || sec.toLowerCase() === needle) return true;
  }
  return (story.primaryCategory ?? story.category) === tag;
}

/** 0–1 tag overlap for clustering. */
export function tagOverlapScore(a: Story, b: Story): number {
  const setA = getStoryTagKeys(a);
  const setB = getStoryTagKeys(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let shared = 0;
  for (const t of setA) {
    if (setB.has(t)) shared += 1;
  }
  return shared / Math.min(setA.size, setB.size);
}

export function formatStoryTagsForPrompt(story: Story): string {
  const primary = story.primaryCategory ?? story.category;
  const secondary = story.secondaryTags?.length
    ? story.secondaryTags.join(", ")
    : "—";
  const strategic = story.strategicTags?.length
    ? story.strategicTags.join(", ")
    : story.tags.filter((t) => t !== primary).join(", ") || "—";
  return `Primary: ${primary} | Strategic: ${strategic} | Topics: ${secondary}`;
}

export function getDisplayTags(story: Story, max = 4): string[] {
  const out: string[] = [];
  const primary = story.primaryCategory ?? story.category;
  const secondary = story.secondaryTags ?? [];
  const strategic = (story.strategicTags ?? []).map((t) => tagDisplayLabel(t));

  for (const t of secondary.slice(0, max)) {
    if (!out.includes(t)) out.push(t);
  }
  for (const t of strategic) {
    if (out.length >= max) break;
    if (t !== primary && !out.includes(t)) out.push(t);
  }
  return out.slice(0, max);
}

export type TagSignalAggregate = {
  tag: string;
  label: string;
  count: number;
  kind: "strategic" | "secondary" | "primary";
};

/** Feed-level tag frequency for signals dashboard. */
export function aggregateTagSignals(
  stories: Story[],
  limit = 12
): TagSignalAggregate[] {
  const counts = new Map<string, TagSignalAggregate>();

  const bump = (tag: string, label: string, kind: TagSignalAggregate["kind"]) => {
    const key = tag.toLowerCase();
    const prev = counts.get(key);
    if (prev) prev.count += 1;
    else counts.set(key, { tag: key, label, count: 1, kind });
  };

  for (const story of stories) {
    bump(story.primaryCategory ?? story.category, tagDisplayLabel(story.category), "primary");
    for (const t of story.strategicTags ?? []) {
      bump(t, tagDisplayLabel(t), "strategic");
    }
    for (const t of story.secondaryTags ?? []) {
      bump(t, t, "secondary");
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
