import "server-only";

import { sortByEditorialImportance } from "@/lib/importance-scoring";
import { applyEditorialCognition } from "@/lib/editorial/apply-cognition";
import { trustedSourceBoost } from "@/lib/editorial/source-authority";
import {
  filterTrustedArticles,
  isTrustedSource,
  TRUSTED_NEWS_API_SOURCE_IDS,
} from "@/lib/news/trusted-sources";
import { mergeNewsApiContent } from "@/lib/extraction/resolve-body";
import { enrichStoryTags } from "@/lib/intelligence/story-tags";
import { buildStorySlug } from "@/lib/slug";
import type { Story, StoryCategory } from "@/lib/types";

const MAX_HEADLINE_LENGTH = 140;
const MAX_SUMMARY_LENGTH = 320;

/** Max NewsAPI HTTP calls per ingest cycle (free-tier budget). */
const INGEST_REQUEST_BUDGET = 3;

interface NewsApiSource {
  id: string | null;
  name: string;
}

interface NewsApiArticle {
  source: NewsApiSource;
  author: string | null;
  title: string | null;
  description: string | null;
  url: string | null;
  urlToImage: string | null;
  publishedAt: string | null;
  content: string | null;
}

interface NewsApiResponse {
  status: string;
  articles?: NewsApiArticle[];
  message?: string;
}

type NewsFetchResult =
  | { ok: true; articles: NewsApiArticle[] }
  | { ok: false; error: string; rateLimited?: boolean };

export type IngestResult = {
  stories: Story[];
  error: string | null;
  rateLimited: boolean;
  requestCount: number;
  ingestedAt: number;
};

const CATEGORY_IMAGES: Record<StoryCategory, string> = {
  ai: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80",
  technology:
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80",
  markets:
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80",
  energy:
    "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&q=80",
  geopolitics:
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=1200&q=80",
  cybersecurity:
    "https://images.unsplash.com/photo-1550751827-4bd374c1f58b?w=1200&q=80",
  startups:
    "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&q=80",
  policy:
    "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=80",
  developer:
    "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&q=80",
};

function logNews(level: "info" | "warn" | "error", message: string): void {
  const line = `[NEWS] ${message}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

function getApiKey(): string | undefined {
  return process.env.NEWS_API_KEY;
}

function isRateLimitError(message: string, status: number): boolean {
  return (
    status === 429 ||
    /rate limit|too many requests|maximum.*reached|developer account/i.test(
      message
    )
  );
}

async function fetchHeadlines(params: {
  country?: string;
  category?: string;
  sources?: string;
  pageSize?: number;
}): Promise<NewsFetchResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { ok: false, error: "NEWS_API_KEY is not configured" };
  }

  const search = new URLSearchParams({
    apiKey,
    pageSize: String(params.pageSize ?? 12),
  });

  if (params.country) search.set("country", params.country);
  if (params.category) search.set("category", params.category);
  if (params.sources) search.set("sources", params.sources);

  const started = Date.now();
  try {
    const res = await fetch(
      `https://newsapi.org/v2/top-headlines?${search.toString()}`,
      {
        cache: "no-store",
        headers: { "User-Agent": "YourNews/1.0" },
      }
    );

    const data = (await res.json()) as NewsApiResponse;
    const durationMs = Date.now() - started;

    if (!res.ok || data.status !== "ok") {
      const message = data.message ?? `News API returned ${res.status}`;
      const rateLimited = isRateLimitError(message, res.status);
      logNews(
        rateLimited ? "warn" : "error",
        `HTTP ${res.status} in ${durationMs}ms — ${message}`
      );
      return { ok: false, error: message, rateLimited };
    }

    logNews(
      "info",
      `Fetched ${data.articles?.length ?? 0} articles in ${durationMs}ms`
    );
    return { ok: true, articles: data.articles ?? [] };
  } catch {
    return { ok: false, error: "Unable to reach News API" };
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, "").replace(/\s+\[\+\d+ chars]$/i, "").trim();
}

function isValidImageUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function inferCategory(
  article: NewsApiArticle,
  defaultCategory: StoryCategory
): StoryCategory {
  const blob = `${article.title ?? ""} ${article.description ?? ""}`.toLowerCase();

  if (/war|geopolit|china|taiwan|nato|military|sanction|ukraine|israel|conflict/.test(blob)) {
    return "geopolitics";
  }
  if (/regulation|policy|congress|legislation|antitrust|ftc|sec\b/.test(blob)) {
    return "policy";
  }
  if (/market|stock|fed|inflation|bank|invest|economy|earnings|treasury/.test(blob)) {
    return "markets";
  }
  if (/energy|oil|solar|climate|renewable|opec|natural gas/.test(blob)) {
    return "energy";
  }
  if (/healthcare|hospital|fda|pharma|medicare|clinical/.test(blob)) {
    return "policy";
  }
  if (/cyber|hack|ransomware|breach/.test(blob)) return "cybersecurity";
  if (/startup|venture|funding/.test(blob)) return "startups";
  if (/\bai\b|machine learning|llm|openai|artificial intelligence/.test(blob)) {
    return "ai";
  }

  return defaultCategory;
}

function buildWhyItMatters(description: string, category: StoryCategory): string {
  if (description.length > 120) return truncate(description, 280);

  const frames: Record<StoryCategory, string> = {
    ai: "Developments in AI shape product roadmaps, competitive moats, and enterprise automation strategy.",
    technology:
      "Technology shifts affect infrastructure investment, talent priorities, and long-term industry positioning.",
    markets:
      "Market-moving news influences capital allocation, risk appetite, and macroeconomic expectations.",
    energy:
      "Energy developments impact industrial costs, climate policy, and commodity-linked portfolios.",
    geopolitics:
      "Geopolitical events can disrupt supply chains, defense posture, and cross-border capital flows.",
    cybersecurity:
      "Security incidents raise operational risk, compliance obligations, and resilience planning priorities.",
    startups:
      "Startup ecosystem news signals where venture capital, talent, and innovation are concentrating.",
    policy:
      "Policy changes affect regulatory exposure, market access, and strategic planning horizons.",
    developer:
      "Developer ecosystem updates influence build-vs-buy decisions and engineering team priorities.",
  };

  return frames[category];
}

function normalizeArticle(
  article: NewsApiArticle,
  index: number,
  defaultCategory: StoryCategory,
  forceTags?: string[]
): Story | null {
  const rawTitle = stripHtml(article.title?.trim() ?? "");
  if (!rawTitle || rawTitle === "[Removed]") return null;

  const description = stripHtml(article.description?.trim() ?? "");
  const newsApiRaw = stripHtml(article.content?.trim() ?? "");
  const newsApiContent = newsApiRaw || undefined;
  const mergedForExcerpt = mergeNewsApiContent(description, newsApiRaw);
  const rawDescription = mergedForExcerpt || description;

  if (!rawDescription && !article.url) return null;

  const category = inferCategory(article, defaultCategory);
  const headline = truncate(rawTitle, MAX_HEADLINE_LENGTH);
  const rawExcerpt = truncate(rawDescription || headline, 600);
  const summary = truncate(rawExcerpt, MAX_SUMMARY_LENGTH);
  const slug = buildStorySlug(headline, article.url, index);

  const words = `${headline} ${summary}`.split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(3, Math.min(12, Math.round(words / 200)));

  const story: Story = {
    slug,
    headline,
    summary,
    rawExcerpt,
    newsApiContent,
    whyItMatters: buildWhyItMatters(rawExcerpt, category),
    category,
    tags: [],
    importance: "medium",
    imageUrl: isValidImageUrl(article.urlToImage)
      ? article.urlToImage
      : CATEGORY_IMAGES[category],
    publishedAt: parsePublishedAt(article.publishedAt),
    source: truncate(article.source?.name?.trim() || "News Desk", 48),
    sourceUrl: article.url?.trim() || undefined,
    readTime,
  };

  let tagged = enrichStoryTags(story);

  if (forceTags?.length) {
    tagged = enrichStoryTags({
      ...tagged,
      tags: [...new Set([...tagged.tags, ...forceTags])],
      strategicTags: [
        ...new Set([...(tagged.strategicTags ?? []), ...forceTags]),
      ],
    });
  }

  if (tagged.category === "markets" || tagged.category === "energy") {
    tagged.economicImplications =
      "Macro and sector implications may affect portfolio positioning, corporate planning, and policy expectations.";
  }

  return tagged;
}

function parsePublishedAt(iso: string | null | undefined): string {
  if (!iso) return new Date().toISOString();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function normalizeArticles(
  articles: NewsApiArticle[],
  defaultCategory: StoryCategory,
  forceTags?: string[]
): Story[] {
  const trustedArticles = filterTrustedArticles(articles, { minKeep: 8 });
  const seen = new Set<string>();
  const stories: Story[] = [];

  for (const article of trustedArticles) {
    const story = normalizeArticle(article, stories.length, defaultCategory, forceTags);
    if (!story || seen.has(story.slug)) continue;
    seen.add(story.slug);
    stories.push(story);
  }

  return stories.sort((a, b) => {
    const trust =
      trustedSourceBoost(b.source) - trustedSourceBoost(a.source);
    if (trust !== 0) return trust;
    return (
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  });
}

function scoreAndDedupe(stories: Story[]): Story[] {
  const scored = applyEditorialCognition(stories);

  const deduped = new Map<string, Story>();
  for (const story of scored) {
    const key = story.sourceUrl ?? story.slug;
    const existing = deduped.get(key);
    if (
      !existing ||
      (story.importanceScore ?? 0) > (existing.importanceScore ?? 0)
    ) {
      deduped.set(key, story);
    }
  }

  return sortByEditorialImportance(Array.from(deduped.values()));
}

/**
 * Central NewsAPI ingest — bounded to INGEST_REQUEST_BUDGET HTTP calls.
 * Does NOT fetch article bodies (AI layer handles extraction on demand).
 */
export async function ingestStoriesFromNewsApi(): Promise<IngestResult> {
  const started = Date.now();
  logNews("info", `Ingest starting (${INGEST_REQUEST_BUDGET} request budget)`);

  const sources = TRUSTED_NEWS_API_SOURCE_IDS.slice(0, 20).join(",");

  const [trusted, business, general] = await Promise.all([
    fetchHeadlines({ sources, pageSize: 30 }),
    fetchHeadlines({ country: "us", category: "business", pageSize: 18 }),
    fetchHeadlines({ country: "us", category: "general", pageSize: 15 }),
  ]);

  const results = [trusted, business, general];
  const requestCount = INGEST_REQUEST_BUDGET;
  const rateLimited = results.some((r) => !r.ok && r.rateLimited);
  const errors = results
    .filter((r): r is { ok: false; error: string } => !r.ok)
    .map((r) => r.error);

  const trustedArticles = trusted.ok ? trusted.articles : [];
  const trustedOnly = trustedArticles.filter((a) =>
    isTrustedSource(a.source?.name ?? "")
  );

  const rawStories = [
    ...normalizeArticles(
      trustedOnly.length > 0 ? trustedOnly : trustedArticles,
      "geopolitics"
    ),
    ...normalizeArticles(business.ok ? business.articles : [], "markets"),
    ...normalizeArticles(general.ok ? general.articles : [], "geopolitics"),
  ];

  const stories = scoreAndDedupe(rawStories);
  const durationMs = Date.now() - started;

  if (stories.length === 0) {
    logNews(
      "warn",
      `Ingest returned 0 stories in ${durationMs}ms — ${errors[0] ?? "no articles"}`
    );
    return {
      stories: [],
      error: errors[0] ?? "No articles returned from News API",
      rateLimited,
      requestCount,
      ingestedAt: Date.now(),
    };
  }

  logNews(
    "info",
    `Ingest complete — ${stories.length} stories, ${requestCount} API calls, ${durationMs}ms`
  );

  return {
    stories,
    error: errors[0] ?? null,
    rateLimited,
    requestCount,
    ingestedAt: Date.now(),
  };
}
