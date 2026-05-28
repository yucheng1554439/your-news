import "server-only";

import { createHash } from "crypto";
import {
  readCachedBodyAsync,
  writeCachedBody,
  type ArticleBodySource,
} from "@/lib/extraction/cache";
import { fetchArticleHtml } from "@/lib/extraction/fetch-url";
import { parseArticleHtml } from "@/lib/extraction/parse-html";
import { cleanArticleText, truncateForModel } from "@/lib/extraction/clean";
import type { Story } from "@/lib/types";

export const MAX_ARTICLE_BODY_CHARS = 10_000;
export const MIN_USEFUL_BODY_CHARS = 280;

export type ResolvedArticleBody = {
  body: string;
  source: ArticleBodySource;
  truncated: string;
};

function isNewsApiTruncated(content: string): boolean {
  return /\[\+\d+\s*chars]$/i.test(content.trim());
}

export function mergeNewsApiContent(
  description: string,
  content: string | null | undefined
): string {
  const parts: string[] = [];
  if (description.trim()) parts.push(description.trim());
  if (content?.trim()) {
    const cleaned = content.replace(/\s+\[\+\d+\s*chars]$/i, "").trim();
    if (cleaned.length > 80) parts.push(cleaned);
  }
  return cleanArticleText(parts.join("\n\n"));
}

export function resolveBodyFromExcerpt(story: Story): ResolvedArticleBody {
  const body = cleanArticleText(story.rawExcerpt ?? story.summary);
  return {
    body,
    source: "excerpt",
    truncated: truncateForModel(body, MAX_ARTICLE_BODY_CHARS),
  };
}

export async function resolveArticleBodyFromUrl(
  sourceUrl: string,
  fallbacks: { newsApiText?: string; excerpt: string }
): Promise<ResolvedArticleBody> {
  const cached = await readCachedBodyAsync(sourceUrl);
  if (cached && cached.body.length >= MIN_USEFUL_BODY_CHARS) {
    return {
      body: cached.body,
      source: cached.source,
      truncated: truncateForModel(cached.body, MAX_ARTICLE_BODY_CHARS),
    };
  }

  const fetched = await fetchArticleHtml(sourceUrl);
  if (fetched.ok) {
    const parsed = parseArticleHtml(fetched.html);
    if (parsed.length >= MIN_USEFUL_BODY_CHARS) {
      writeCachedBody(sourceUrl, parsed, "url");
      return {
        body: parsed,
        source: "url",
        truncated: truncateForModel(parsed, MAX_ARTICLE_BODY_CHARS),
      };
    }
  }

  const newsApi = fallbacks.newsApiText?.trim() ?? "";
  if (newsApi.length >= MIN_USEFUL_BODY_CHARS && !isNewsApiTruncated(newsApi)) {
    const cleaned = cleanArticleText(newsApi);
    writeCachedBody(sourceUrl, cleaned, "newsapi");
    return {
      body: cleaned,
      source: "newsapi",
      truncated: truncateForModel(cleaned, MAX_ARTICLE_BODY_CHARS),
    };
  }

  const excerptBody = cleanArticleText(fallbacks.excerpt);
  if (excerptBody.length >= 80) {
    writeCachedBody(sourceUrl, excerptBody, "excerpt");
  }

  return {
    body: excerptBody,
    source: "excerpt",
    truncated: truncateForModel(excerptBody, MAX_ARTICLE_BODY_CHARS),
  };
}

export async function ensureStoryArticleBody(
  story: Story
): Promise<Story> {
  if (
    story.articleBody &&
    story.articleBody.length >= MIN_USEFUL_BODY_CHARS &&
    story.articleBodySource === "url"
  ) {
    return story;
  }

  if (!story.sourceUrl) {
    const fallback = resolveBodyFromExcerpt(story);
    return {
      ...story,
      articleBody: fallback.body,
      articleBodySource: fallback.source,
    };
  }

  const resolved = await resolveArticleBodyFromUrl(story.sourceUrl, {
    newsApiText: story.newsApiContent,
    excerpt: story.rawExcerpt ?? story.summary,
  });

  return {
    ...story,
    articleBody: resolved.body,
    articleBodySource: resolved.source,
  };
}

export function articleBodyFingerprint(story: Story): string {
  const material =
    story.articleBody?.slice(0, 500) ??
    story.rawExcerpt?.slice(0, 200) ??
    story.summary;
  return createHash("sha256").update(material).digest("hex").slice(0, 12);
}
