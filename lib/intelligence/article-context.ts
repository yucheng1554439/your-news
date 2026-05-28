import { truncateForModel } from "@/lib/extraction/clean";
import { MAX_ARTICLE_BODY_CHARS } from "@/lib/extraction/resolve-body";
import type { Story } from "@/lib/types";

const SOURCE_LABEL: Record<NonNullable<Story["articleBodySource"]>, string> = {
  url: "full article (publisher page)",
  newsapi: "extended NewsAPI content",
  excerpt: "headline excerpt only — infer carefully",
};

/** Primary material for AI — prefers extracted full article body. */
export function getArticleContext(story: Story): string {
  const body = story.articleBody?.trim();
  const source = story.articleBodySource ?? "excerpt";
  const sourceNote = SOURCE_LABEL[source];

  if (body && body.length >= 200) {
    const text = truncateForModel(body, MAX_ARTICLE_BODY_CHARS);
    return [
      `FULL ARTICLE TEXT (${sourceNote}):`,
      text,
      "",
      `Headline: ${story.headline}`,
      `Publisher: ${story.source}`,
      `Published: ${story.publishedAt}`,
      `Tags: ${story.tags.join(", ")}`,
      "",
      "Read the full text above before writing. Base every claim on this material.",
    ].join("\n");
  }

  const excerpt = story.rawExcerpt?.trim() || story.summary;
  return [
    `LIMITED SOURCE (excerpt only — do not invent facts):`,
    `Headline: ${story.headline}`,
    `Publisher: ${story.source}`,
    `Published: ${story.publishedAt}`,
    `Excerpt: ${excerpt.slice(0, 900)}`,
  ].join("\n");
}
