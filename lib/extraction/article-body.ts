import { isPaywallContent } from "@/lib/extraction/paywall";
import type { Story } from "@/lib/types";

const MIN_USEFUL_BODY_CHARS = 280;

/** True when a publisher body was extracted and is usable for full AI intelligence. */
export function isArticleBodyAvailable(story: Story): boolean {
  if (story.articleBodyAvailable === false) return false;
  if (story.articleBodyAvailable === true) return true;

  const body = story.articleBody?.trim();
  if (!body || body.length < MIN_USEFUL_BODY_CHARS) return false;
  if (isPaywallContent(body)) return false;

  const source = story.articleBodySource;
  return source === "url" || source === "newsapi";
}

/** Metadata-only intelligence path — no usable extracted article body. */
export function needsMetadataIntelligence(story: Story): boolean {
  return !isArticleBodyAvailable(story);
}
