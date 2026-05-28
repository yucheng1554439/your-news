export const PERSIST_KEYS = {
  storyPool: "yn:v1:story-pool",
  articleBodies: "yn:v1:article-bodies",
  intelligenceSnapshot: "yn:v2:intelligence-snapshot",
  intelligenceMeta: "yn:v2:intelligence-meta",
  weeklyBriefingPrefix: "yn:v1:weekly:",
} as const;

export function weeklyBriefingKey(cacheKey: string): string {
  return `${PERSIST_KEYS.weeklyBriefingPrefix}${cacheKey}`;
}

export function storyIntelligenceKey(slug: string, profileHash: string): string {
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "_").slice(0, 80);
  return `yn:v2:story-intel:${safeSlug}:${profileHash}`;
}
