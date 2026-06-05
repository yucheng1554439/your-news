import type { DashboardPayload, Story } from "@/types";
import type { SavedStorySnapshot } from "@/types/saved";
import { snapshotToStory } from "@/lib/saved-snapshot";

export function formatStoryDate(publishedAt: string): string {
  const t = Date.parse(publishedAt);
  if (!Number.isFinite(t)) return "";
  const diff = Date.now() - t;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(t).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function getDisplayTags(story: Story, max = 3): string[] {
  const tags = [
    ...(story.strategicTags ?? []),
    ...(story.secondaryTags ?? []),
  ]
    .map((t) => t.replace(/-/g, " "))
    .filter(Boolean);
  return [...new Set(tags)].slice(0, max);
}

export function isCriticalStory(
  story: Story,
  personalized = false
): boolean {
  if (personalized && story.personalizedImportanceLabel === "Critical") {
    return true;
  }
  return (
    story.importanceLabel === "Critical" ||
    (story.importanceScore ?? 0) >= 8.5
  );
}

export function storyBySlug(stories: Story[], slug: string): Story | undefined {
  return stories.find((s) => s.slug === slug);
}

export function resolveStoriesBySlugs(
  stories: Story[],
  slugs: string[]
): Story[] {
  const map = new Map(stories.map((s) => [s.slug, s]));
  return slugs
    .map((slug) => map.get(slug))
    .filter((s): s is Story => Boolean(s));
}

export function allStoryPool(dashboard: DashboardPayload): Story[] {
  const seen = new Set<string>();
  const out: Story[] = [];
  for (const s of [...dashboard.stories, ...dashboard.globalStories]) {
    if (seen.has(s.slug)) continue;
    seen.add(s.slug);
    out.push(s);
  }
  return out;
}

export function savedStoriesFromDashboard(
  dashboard: DashboardPayload
): Story[] {
  const slugs = dashboard.userIntelligence?.savedSlugs ?? [];
  if (slugs.length === 0) return [];
  const pool = allStoryPool(dashboard);
  const map = new Map(pool.map((s) => [s.slug, s]));
  return slugs
    .map((slug) => map.get(slug))
    .filter((s): s is Story => Boolean(s));
}

export function resolveSavedStoryItems(
  snapshots: SavedStorySnapshot[]
): Story[] {
  return snapshots.map(snapshotToStory);
}
