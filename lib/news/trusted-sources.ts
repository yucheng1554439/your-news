/**
 * Editorial allowlist — NewsAPI results are filtered and ranked against these outlets.
 */
export const TRUSTED_SOURCE_NAMES = [
  "reuters",
  "bloomberg",
  "wall street journal",
  "wsj",
  "new york times",
  "washington post",
  "cnn",
  "nbc",
  "abc news",
  "abc ",
  "fox news",
  "cnbc",
  "axios",
  "espn",
  "techcrunch",
  "the verge",
  "financial times",
  "los angeles times",
  "la times",
  "associated press",
  "ap news",
  "politico",
  "bbc",
  "npr",
  "usa today",
  "business insider",
  "fortune",
  "wired",
  "ars technica",
] as const;

/** NewsAPI source ids (subset supported on developer tier). */
export const TRUSTED_NEWS_API_SOURCE_IDS = [
  "reuters",
  "cnn",
  "nbc-news",
  "abc-news",
  "fox-news",
  "cnbc",
  "axios",
  "espn",
  "techcrunch",
  "the-verge",
  "the-washington-post",
  "the-new-york-times",
  "the-wall-street-journal",
  "bloomberg",
  "associated-press",
  "politico",
  "bbc-news",
  "npr",
  "the-los-angeles-times",
  "business-insider",
  "fortune",
  "wired",
  "ars-technica",
] as const;

export function normalizeSourceName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
}

export function isTrustedSource(sourceName: string): boolean {
  const normalized = normalizeSourceName(sourceName);
  return TRUSTED_SOURCE_NAMES.some(
    (trusted) =>
      normalized.includes(trusted) || trusted.includes(normalized)
  );
}

/** Higher = more trusted for ranking tie-breaks (tier-weighted). */
export { trustedSourceBoost } from "@/lib/editorial/source-authority";

export function filterTrustedArticles<T extends { source: { name?: string | null } }>(
  articles: T[],
  options?: { minKeep?: number }
): T[] {
  const minKeep = options?.minKeep ?? 12;
  const trusted = articles.filter((a) =>
    isTrustedSource(a.source?.name?.trim() ?? "")
  );

  if (trusted.length >= minKeep) return trusted;

  const trustedSet = new Set(trusted);
  const remainder = articles.filter((a) => !trustedSet.has(a));
  const needed = minKeep - trusted.length;

  return [...trusted, ...remainder.slice(0, needed)];
}
