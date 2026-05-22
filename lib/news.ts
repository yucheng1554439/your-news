import "server-only";

import {
  applyEditorialImportanceScores,
  buildSourceCountMap,
  sortByEditorialImportance,
} from "@/lib/importance-scoring";
import {
  filterTrustedArticles,
  isTrustedSource,
  TRUSTED_NEWS_API_SOURCE_IDS,
  trustedSourceBoost,
} from "@/lib/news/trusted-sources";
import type { Story, StoryCategory } from "@/lib/types";

const NEWS_API_BASE = "https://newsapi.org/v2/top-headlines";
/** Short revalidation so refreshes pull newer headlines. */
const REVALIDATE_SECONDS = 60;
const MAX_HEADLINE_LENGTH = 140;
const MAX_SUMMARY_LENGTH = 320;

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
  | { ok: false; error: string };

export type LiveNewsResult = {
  stories: Story[];
  error: string | null;
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

function getApiKey(): string | undefined {
  return process.env.NEWS_API_KEY;
}

async function fetchHeadlines(params: {
  country?: string;
  category?: string;
  q?: string;
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
  if (params.q) search.set("q", params.q);
  if (params.sources) search.set("sources", params.sources);

  try {
    const res = await fetch(`${NEWS_API_BASE}?${search.toString()}`, {
      next: { revalidate: REVALIDATE_SECONDS },
      cache: "no-store",
      headers: { "User-Agent": "YourNews/1.0" },
    });

    const data = (await res.json()) as NewsApiResponse;

    if (!res.ok || data.status !== "ok") {
      return {
        ok: false,
        error: data.message ?? `News API returned ${res.status}`,
      };
    }

    return { ok: true, articles: data.articles ?? [] };
  } catch {
    return { ok: false, error: "Unable to reach News API" };
  }
}

/** Trusted US outlets via NewsAPI source ids. */
export async function fetchTrustedSourcesNews(
  pageSize = 20
): Promise<NewsFetchResult> {
  const sources = TRUSTED_NEWS_API_SOURCE_IDS.slice(0, 20).join(",");
  return fetchHeadlines({ sources, pageSize });
}

/** US top headlines (general). */
export async function fetchTopHeadlines(
  pageSize = 12
): Promise<NewsFetchResult> {
  return fetchHeadlines({ country: "us", category: "general", pageSize });
}

/** US technology category headlines. */
export async function fetchTechnologyNews(
  pageSize = 12
): Promise<NewsFetchResult> {
  return fetchHeadlines({ country: "us", category: "technology", pageSize });
}

/** US business category headlines. */
export async function fetchBusinessNews(
  pageSize = 12
): Promise<NewsFetchResult> {
  return fetchHeadlines({ country: "us", category: "business", pageSize });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
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

  if (/\bai\b|machine learning|llm|openai|artificial intelligence/.test(blob)) {
    return "ai";
  }
  if (/cyber|hack|ransomware|breach/.test(blob)) return "cybersecurity";
  if (/startup|venture|funding/.test(blob)) return "startups";
  if (/energy|oil|solar|climate|renewable/.test(blob)) return "energy";
  if (/war|geopolit|china|taiwan|nato|military/.test(blob)) return "geopolitics";
  if (/regulation|policy|congress|law/.test(blob)) return "policy";
  if (/market|stock|fed|inflation|bank|invest|economy/.test(blob)) return "markets";
  if (
    defaultCategory === "energy" ||
    /\b(science|research|nasa|space|study|climate science|laboratory)\b/.test(blob)
  ) {
    return "energy";
  }

  return defaultCategory;
}

function inferTags(
  article: NewsApiArticle,
  category: StoryCategory,
  defaultCategory: StoryCategory
): string[] {
  const tags = new Set<string>([category]);
  const blob = `${article.title ?? ""} ${article.description ?? ""}`.toLowerCase();

  if (defaultCategory === "energy" && /\b(science|research|nasa|space)\b/.test(blob)) {
    tags.add("science");
  }
  if (
    defaultCategory === "geopolitics" ||
    /\b(sport|nfl|nba|mlb|soccer|olympic|championship)\b/.test(blob)
  ) {
    if (/\b(sport|nfl|nba|mlb|soccer|olympic|championship|athlete)\b/.test(blob)) {
      tags.add("sports");
    }
  }

  return [...tags];
}

function parsePublishedAt(iso: string | null | undefined): string {
  if (!iso) return new Date().toISOString();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
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
  defaultCategory: StoryCategory
): Story | null {
  const rawTitle = stripHtml(article.title?.trim() ?? "");
  if (!rawTitle || rawTitle === "[Removed]") return null;

  const rawDescription = stripHtml(
    article.description?.trim() ?? article.content?.trim() ?? ""
  );
  if (!rawDescription && !article.url) return null;

  const category = inferCategory(article, defaultCategory);
  const headline = truncate(rawTitle, MAX_HEADLINE_LENGTH);
  const rawExcerpt = truncate(
    rawDescription || "Coverage is developing. Check the source for the latest reporting.",
    600
  );
  const summary = truncate(rawExcerpt, MAX_SUMMARY_LENGTH);

  const slugBase = slugify(headline);
  const urlPart = article.url ? slugify(article.url).slice(-12) : String(index);
  const slug = `${slugBase}-${urlPart}`;

  const words = `${headline} ${summary}`.split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(3, Math.min(12, Math.round(words / 200)));

  const story: Story = {
    slug,
    headline,
    summary,
    rawExcerpt,
    whyItMatters: buildWhyItMatters(rawExcerpt, category),
    category,
    tags: inferTags(article, category, defaultCategory),
    importance: "medium",
    imageUrl: isValidImageUrl(article.urlToImage)
      ? article.urlToImage
      : CATEGORY_IMAGES[category],
    publishedAt: parsePublishedAt(article.publishedAt),
    source: truncate(article.source?.name?.trim() || "News Desk", 48),
    sourceUrl: article.url?.trim() || undefined,
    readTime,
  };

  if (category === "markets" || category === "energy") {
    story.economicImplications =
      "Macro and sector implications may affect portfolio positioning, corporate planning, and policy expectations.";
  }

  return story;
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
    const story = normalizeArticle(article, stories.length, defaultCategory);
    if (!story || seen.has(story.slug)) continue;
    if (forceTags?.length) {
      story.tags = [...new Set([...story.tags, ...forceTags])];
    }
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

/** Aggregates headline feeds and normalizes into Story objects. Server-only. */
export async function fetchLiveStories(): Promise<LiveNewsResult> {
  const [trusted, tech, business, science, sports] = await Promise.all([
    fetchTrustedSourcesNews(24),
    fetchTechnologyNews(10),
    fetchBusinessNews(10),
    fetchHeadlines({ country: "us", category: "science", pageSize: 8 }),
    fetchHeadlines({ country: "us", category: "sports", pageSize: 8 }),
  ]);

  const errors = [trusted, tech, business, science, sports]
    .filter((r): r is { ok: false; error: string } => !r.ok)
    .map((r) => r.error);

  const trustedGeneral = trusted.ok ? trusted.articles : [];
  const trustedOnly = trustedGeneral.filter((a) =>
    isTrustedSource(a.source?.name ?? "")
  );

  const stories = [
    ...normalizeArticles(
      trustedOnly.length > 0 ? trustedOnly : trustedGeneral,
      "geopolitics"
    ),
    ...normalizeArticles(tech.ok ? tech.articles : [], "technology"),
    ...normalizeArticles(business.ok ? business.articles : [], "markets"),
    ...normalizeArticles(science.ok ? science.articles : [], "energy"),
    ...normalizeArticles(sports.ok ? sports.articles : [], "markets", ["sports"]),
  ];

  const sourceCounts = buildSourceCountMap(stories);

  const deduped = new Map<string, Story>();
  for (const story of stories) {
    if (!deduped.has(story.slug)) deduped.set(story.slug, story);
  }

  const merged = sortByEditorialImportance(
    applyEditorialImportanceScores(Array.from(deduped.values()), sourceCounts)
  );

  if (merged.length === 0) {
    return {
      stories: [],
      error: errors[0] ?? "No articles returned from News API",
    };
  }

  return { stories: merged, error: errors[0] ?? null };
}
