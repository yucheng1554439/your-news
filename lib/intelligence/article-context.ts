import { formatStoryTagsForPrompt } from "@/lib/intelligence/story-tags";
import { truncateForModel } from "@/lib/extraction/clean";
import { PAYWALL_SIGNAL_DISCLAIMER } from "@/lib/extraction/paywall";
import { MAX_ARTICLE_BODY_CHARS } from "@/lib/extraction/resolve-body";
import type { ClusterIntelligence, Story } from "@/lib/types";

const MAX_CLUSTER_ARTICLE_CHARS = 1200;
const MAX_CLUSTER_ARTICLES_IN_PROMPT = 24;

const SOURCE_LABEL: Record<NonNullable<Story["articleBodySource"]>, string> = {
  url: "full article (publisher page)",
  newsapi: "extended NewsAPI content",
  excerpt: "headline excerpt only — infer carefully",
};

/** Primary material for AI — prefers extracted full article body. */
export function getArticleContext(story: Story): string {
  if (story.paywallDetected) {
    return getPaywallSignalContext(story);
  }

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
      `Tags: ${formatStoryTagsForPrompt(story)}`,
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

function metadataOnly(story: Story): string {
  return (story.rawExcerpt ?? story.summary).trim();
}

/** Metadata + corroboration context when the publisher page is paywalled. */
export function getPaywallSignalContext(
  story: Story,
  corroborating: Story[] = []
): string {
  const excerpt = metadataOnly(story);
  const corroborationBlocks = corroborating
    .slice(0, 6)
    .map(
      (s, i) =>
        `--- Corroborating ${i + 1} [${s.slug}] ---
Publisher: ${s.source}
Headline: ${s.headline}
Excerpt: ${metadataOnly(s).slice(0, 500)}`
    );

  return [
    "PAYWALLED SOURCE — DO NOT USE PAYWALL TEXT AS ARTICLE BODY.",
    PAYWALL_SIGNAL_DISCLAIMER,
    "",
    `Headline: ${story.headline}`,
    `Publisher: ${story.source}`,
    `Published: ${story.publishedAt}`,
    `Description: ${excerpt.slice(0, 900)}`,
    `Tags: ${formatStoryTagsForPrompt(story)}`,
    "",
    corroborationBlocks.length > 0
      ? "CORROBORATING COVERAGE IN POOL:\n" + corroborationBlocks.join("\n\n")
      : "No corroborating articles found in pool — stay within headline and description.",
    "",
    "Summarize the EVENT from metadata and corroboration. Do not describe the paywall.",
  ].join("\n");
}

/** Multi-source event material for story intelligence generation. */
export function getClusterArticleContext(
  lead: Story,
  cluster: ClusterIntelligence,
  materialStories: Story[]
): string {
  const sources = cluster.sources
    .slice(0, 12)
    .map((s) => s.name)
    .join(", ");

  const blocks = materialStories
    .slice(0, MAX_CLUSTER_ARTICLES_IN_PROMPT)
    .map((s, i) => {
      const body = s.paywallDetected
        ? metadataOnly(s)
        : s.articleBody?.trim() || s.rawExcerpt?.trim() || s.summary;
      const text = truncateForModel(body, MAX_CLUSTER_ARTICLE_CHARS);
      const paywallNote = s.paywallDetected ? " (metadata only — paywalled)" : "";
      return `--- Article ${i + 1} [${s.slug}]${paywallNote} ---
Publisher: ${s.source}
Published: ${s.publishedAt}
Headline: ${s.headline}
${text}`;
    });

  return [
    `NARRATIVE EVENT (synthesize ONE development — not ${cluster.articleCount} separate stories):`,
    `Event: ${cluster.title}`,
    `Summary lens: ${cluster.summary}`,
    `Coverage: ${cluster.articleCount} articles · ${cluster.sourceCount} outlets (${sources})`,
    "",
    "Read ALL articles below. Ground every claim in this set. Only use material that matches the lead story event — ignore unrelated topics.",
    "",
    ...blocks,
    "",
    `Lead representative: ${lead.headline} (${lead.source})`,
    `Tags: ${formatStoryTagsForPrompt(lead)}`,
  ].join("\n");
}
