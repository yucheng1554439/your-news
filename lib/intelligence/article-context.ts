import type { Story } from "@/lib/types";

/** Source material for AI analysis (not the generated briefing). */
export function getArticleContext(story: Story): string {
  const excerpt = story.rawExcerpt?.trim() || story.summary;
  return [
    `Headline: ${story.headline}`,
    `Source: ${story.source}`,
    `Published: ${story.publishedAt}`,
    `Category: ${story.category}`,
    `Excerpt: ${excerpt.slice(0, 700)}`,
  ].join("\n");
}
