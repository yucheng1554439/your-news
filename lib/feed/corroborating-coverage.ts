import { getStorySourceTier } from "@/lib/editorial/source-authority";
import { extractEntities } from "@/lib/editorial/narrative-clusters";
import { normalizeHeadlineKey } from "@/lib/importance-scoring";
import type { Story } from "@/lib/types";

const STOPWORDS = new Set([
  "about",
  "after",
  "before",
  "being",
  "between",
  "could",
  "during",
  "first",
  "from",
  "have",
  "into",
  "just",
  "latest",
  "live",
  "more",
  "news",
  "over",
  "report",
  "reports",
  "says",
  "their",
  "there",
  "these",
  "those",
  "through",
  "today",
  "update",
  "updates",
  "week",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "would",
  "year",
]);

function headlineOverlap(a: Story, b: Story): number {
  const tokensA = new Set(
    normalizeHeadlineKey(a.headline)
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );
  const tokensB = new Set(
    normalizeHeadlineKey(b.headline)
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let shared = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) shared += 1;
  }
  return shared / Math.min(tokensA.size, tokensB.size);
}

function topicTerms(story: Story): string[] {
  const blob = `${story.headline} ${story.rawExcerpt ?? story.summary}`;
  return [
    ...new Set(
      blob
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 4 && !STOPWORDS.has(word))
    ),
  ];
}

function sharedTopicTerms(a: Story, b: Story): string[] {
  const termsB = new Set(topicTerms(b));
  return topicTerms(a).filter((term) => termsB.has(term));
}

/** Named entities + distinctive headline terms (e.g. hantavirus, euphoria, ferrari). */
export function extractCorroborationEntities(story: Story): string[] {
  const patternEntities = story.narrativeEntities ?? extractEntities(story);
  const headlineTerms = topicTerms(story).filter((term) => term.length >= 5);
  return [...new Set([...patternEntities, ...headlineTerms])];
}

function sharedNamedEntities(a: Story, b: Story): string[] {
  const entitiesB = new Set(extractCorroborationEntities(b));
  return extractCorroborationEntities(a).filter((entity) => entitiesB.has(entity));
}

/**
 * True when candidate covers the same event as anchor.
 * Requires headline similarity, shared named entities, or shared topic terms —
 * never category, cluster, or week alone.
 */
export function isSameEventCoverage(anchor: Story, candidate: Story): boolean {
  if (anchor.slug === candidate.slug) return false;

  const headScore = headlineOverlap(anchor, candidate);
  if (headScore >= 0.45) return true;

  const topics = sharedTopicTerms(anchor, candidate);
  const entities = sharedNamedEntities(anchor, candidate);

  if (topics.length >= 2 && headScore >= 0.3) return true;
  if (
    topics.some((term) => term.length >= 8) &&
    topics.length >= 1 &&
    headScore >= 0.24
  ) {
    return true;
  }

  if (entities.length >= 2 && headScore >= 0.22) return true;
  if (entities.length >= 1 && topics.length >= 2) return true;
  if (entities.length >= 1 && headScore >= 0.38) return true;

  return false;
}

function corroborationScore(story: Story, anchor: Story): number {
  const headScore = headlineOverlap(anchor, story);
  const topics = sharedTopicTerms(anchor, story);
  const entities = sharedNamedEntities(anchor, story);

  return (
    headScore * 6 +
    topics.length * 2.5 +
    entities.length * 3 +
    (4 - getStorySourceTier(story)) * 0.25
  );
}

/**
 * Strict same-event corroboration for story intelligence (not weekly briefing).
 */
export function findCorroboratingStoriesForIntelligence(
  story: Story,
  pool: Story[],
  limit = 6
): Story[] {
  return pool
    .filter((candidate) => isSameEventCoverage(story, candidate))
    .map((candidate) => ({
      story: candidate,
      score: corroborationScore(candidate, story),
    }))
    .filter(({ score }) => score >= 4.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ story: s }) => s);
}

/**
 * Find other stories in the pool covering the same event.
 */
export function findCorroboratingStories(
  story: Story,
  pool: Story[],
  limit = 8
): Story[] {
  return findCorroboratingStoriesForIntelligence(story, pool, limit);
}
