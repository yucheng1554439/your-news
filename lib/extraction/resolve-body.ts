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
import { isArticleBodyAvailable } from "@/lib/extraction/article-body";
import { isPaywallContent } from "@/lib/extraction/paywall";
import { enrichStoryTags } from "@/lib/intelligence/story-tags";
import type { Story } from "@/lib/types";

export const MAX_ARTICLE_BODY_CHARS = 10_000;
export const MIN_USEFUL_BODY_CHARS = 280;

export type ResolvedArticleBody = {
  body: string;
  source: ArticleBodySource;
  truncated: string;
  paywallDetected: boolean;
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
    paywallDetected: Boolean(story.paywallDetected),
  };
}

export async function resolveArticleBodyFromUrl(
  sourceUrl: string,
  fallbacks: { newsApiText?: string; excerpt: string }
): Promise<ResolvedArticleBody> {
  let paywallBlocked = false;

  const cached = await readCachedBodyAsync(sourceUrl);
  if (cached && cached.body.length >= MIN_USEFUL_BODY_CHARS) {
    if (isPaywallContent(cached.body)) {
      paywallBlocked = true;
    } else {
      return {
        body: cached.body,
        source: cached.source,
        truncated: truncateForModel(cached.body, MAX_ARTICLE_BODY_CHARS),
        paywallDetected: false,
      };
    }
  }

  const fetched = await fetchArticleHtml(sourceUrl);
  if (fetched.ok) {
    const parsed = parseArticleHtml(fetched.html);
    if (isPaywallContent(parsed)) {
      paywallBlocked = true;
    } else if (parsed.length >= MIN_USEFUL_BODY_CHARS) {
      writeCachedBody(sourceUrl, parsed, "url");
      return {
        body: parsed,
        source: "url",
        truncated: truncateForModel(parsed, MAX_ARTICLE_BODY_CHARS),
        paywallDetected: false,
      };
    }
  }

  const newsApi = fallbacks.newsApiText?.trim() ?? "";
  if (
    newsApi.length >= MIN_USEFUL_BODY_CHARS &&
    !isNewsApiTruncated(newsApi) &&
    !isPaywallContent(newsApi)
  ) {
    const cleaned = cleanArticleText(newsApi);
    writeCachedBody(sourceUrl, cleaned, "newsapi");
    return {
      body: cleaned,
      source: "newsapi",
      truncated: truncateForModel(cleaned, MAX_ARTICLE_BODY_CHARS),
      paywallDetected: paywallBlocked,
    };
  }

  const excerptBody = cleanArticleText(fallbacks.excerpt);
  if (excerptBody.length >= 80 && !isPaywallContent(excerptBody)) {
    writeCachedBody(sourceUrl, excerptBody, "excerpt");
  }

  return {
    body: excerptBody,
    source: "excerpt",
    truncated: truncateForModel(excerptBody, MAX_ARTICLE_BODY_CHARS),
    paywallDetected: paywallBlocked || excerptBody.length < MIN_USEFUL_BODY_CHARS,
  };
}

export async function ensureStoryArticleBody(
  story: Story
): Promise<Story> {
  if (
    story.articleBody &&
    story.articleBody.length >= MIN_USEFUL_BODY_CHARS &&
    (story.articleBodySource === "url" || story.articleBodySource === "newsapi") &&
    !isPaywallContent(story.articleBody)
  ) {
    return enrichStoryTags({
      ...story,
      paywallDetected: false,
      articleBodyAvailable: true,
    });
  }

  if (!story.sourceUrl) {
    const fallback = resolveBodyFromExcerpt(story);
    const enriched = {
      ...story,
      articleBody: fallback.body,
      articleBodySource: fallback.source as "excerpt",
    };
    const available = isArticleBodyAvailable(enriched);
    return enrichStoryTags({
      ...enriched,
      paywallDetected: !available,
      articleBodyAvailable: available,
    });
  }

  const resolved = await resolveArticleBodyFromUrl(story.sourceUrl, {
    newsApiText: story.newsApiContent,
    excerpt: story.rawExcerpt ?? story.summary,
  });

  const bodyAvailable =
    !resolved.paywallDetected &&
    resolved.body.length >= MIN_USEFUL_BODY_CHARS &&
    !isPaywallContent(resolved.body) &&
    (resolved.source === "url" || resolved.source === "newsapi");

  const metadataBody = cleanArticleText(story.rawExcerpt ?? story.summary);

  return enrichStoryTags({
    ...story,
    articleBody: bodyAvailable ? resolved.body : metadataBody,
    articleBodySource: bodyAvailable ? resolved.source : "excerpt",
    paywallDetected: !bodyAvailable,
    articleBodyAvailable: bodyAvailable,
  });
}

export function articleBodyFingerprint(story: Story): string {
  const material =
    story.articleBody?.slice(0, 500) ??
    story.rawExcerpt?.slice(0, 200) ??
    story.summary;
  return createHash("sha256").update(material).digest("hex").slice(0, 12);
}
