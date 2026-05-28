import { cleanArticleText } from "@/lib/extraction/clean";

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function stripTagsToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<[^>]+>/g, " ")
  );
}

function extractContainer(html: string): string {
  const patterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<div[^>]+class="[^"]*article-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class="[^"]*story-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+itemprop="articleBody"[^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1] && match[1].length > 400) {
      return match[1];
    }
  }

  return html;
}

/** Heuristic HTML → article body (no external parser). */
export function parseArticleHtml(html: string): string {
  const container = extractContainer(html);
  const text = cleanArticleText(stripTagsToText(container));
  return text;
}
