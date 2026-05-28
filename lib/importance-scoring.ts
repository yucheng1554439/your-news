import { getStorySourceTier } from "@/lib/editorial/source-authority";
import {
  assessStrategicSignal,
  getStrategicSignal,
} from "@/lib/signal/strategic-score";
import type {
  EditorialImportanceLabel,
  Importance,
  Story,
  StoryCategory,
} from "@/lib/types";

export type ImportanceScoreSignals = {
  sourceCount?: number;
};

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

const MARKET_KEYWORDS =
  /\b(market|stock|fed|inflation|gdp|earnings|trade|bank|invest|economy|recession|rate|ipo|bond|commodity|oil price)\b/i;

const GEOPOLITICAL_KEYWORDS =
  /\b(war|geopolit|china|taiwan|nato|military|sanction|diplomat|conflict|ukraine|israel|election|president|congress|eu\b|brexit)\b/i;

const AI_INFRA_KEYWORDS =
  /\b(ai\b|openai|anthropic|nvidia|chip|semiconductor|data center|llm|model training)\b/i;

export function normalizeHeadlineKey(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 80);
}

export function computeRecencyScore(publishedAt: string, now = Date.now()): number {
  const published = new Date(publishedAt).getTime();
  if (Number.isNaN(published)) return 0.3;

  const ageMs = Math.max(0, now - published);
  if (ageMs <= 6 * MS_PER_HOUR) return 0.75;
  if (ageMs <= MS_PER_DAY) return 0.65;
  if (ageMs <= 3 * MS_PER_DAY) return 0.5;
  if (ageMs <= 7 * MS_PER_DAY) return 0.35;
  return 0.2;
}

export function computeSourceCountScore(sourceCount: number): number {
  if (sourceCount >= 4) return 1;
  if (sourceCount === 3) return 0.85;
  if (sourceCount === 2) return 0.65;
  return 0.35;
}

function storyBlob(story: Story): string {
  return `${story.headline} ${story.articleBody ?? story.rawExcerpt ?? story.summary}`;
}

export function computeMarketRelevance(story: Story): number {
  const blob = storyBlob(story);
  let score = story.category === "markets" || story.category === "energy" ? 0.7 : 0.15;
  if (MARKET_KEYWORDS.test(blob)) score = Math.min(1, score + 0.35);
  return score;
}

export function computeGeopoliticalSignificance(story: Story): number {
  const blob = storyBlob(story);
  let score =
    story.category === "geopolitics" || story.category === "policy" ? 0.75 : 0.12;
  if (GEOPOLITICAL_KEYWORDS.test(blob)) score = Math.min(1, score + 0.4);
  return score;
}

export function computeAiSignificance(story: Story): number {
  const blob = storyBlob(story);
  if (story.tags.includes("gaming") && !story.tags.includes("semiconductors")) {
    return 0.1;
  }
  let score = story.tags.some((t) =>
    ["ai", "ai-infrastructure", "semiconductors", "enterprise-ai"].includes(t)
  )
    ? 0.75
    : 0.15;
  if (AI_INFRA_KEYWORDS.test(blob)) score = Math.min(1, score + 0.35);
  return score;
}

export function scoreStoryImportance(
  story: Story,
  signals: ImportanceScoreSignals = {}
): number {
  const sourceCount = signals.sourceCount ?? 1;
  const strategic = getStrategicSignal(story);

  const tier = getStorySourceTier(story);
  const authorityBoost =
    tier === 1 ? 0.06 : tier === 2 ? 0.02 : tier === 3 ? -0.08 : 0;
  const corroboration = story.corroborationScore ?? 0;

  const weighted =
    strategic * 0.38 +
    computeMarketRelevance(story) * 0.14 +
    computeGeopoliticalSignificance(story) * 0.12 +
    computeAiSignificance(story) * 0.12 +
    computeSourceCountScore(sourceCount) * 0.12 +
    computeRecencyScore(story.publishedAt) * 0.08 +
    corroboration * 0.1 +
    authorityBoost +
    (story.tags.includes("policy") ? 0.04 : 0);

  let raw = 1 + weighted * 9;

  if (story.lowSignal) {
    raw = Math.min(raw, 4);
  }

  return Math.round(Math.min(10, Math.max(1, raw)));
}

export function importanceLabelFromScore(
  score: number,
  sourceCount = 1,
  lowSignal = false
): EditorialImportanceLabel {
  if (lowSignal) return "Low";
  if (score >= 9 && sourceCount >= 2) return "Critical";
  if (score >= 7) return "High";
  if (score >= 4) return "Moderate";
  return "Low";
}

export function isCriticalForDisplay(story: Story): boolean {
  if (story.lowSignal) return false;
  return (
    story.importanceLabel === "Critical" &&
    (story.importanceScore ?? 0) >= 9 &&
    getStrategicSignal(story) >= 0.4
  );
}

export function legacyImportanceFromLabel(
  label: EditorialImportanceLabel
): Importance {
  switch (label) {
    case "Critical":
      return "critical";
    case "High":
      return "high";
    case "Moderate":
    case "Low":
    default:
      return "medium";
  }
}

export function buildSourceCountMap(stories: Story[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const story of stories) {
    const key = normalizeHeadlineKey(story.headline);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export function applyEditorialImportanceScores(
  stories: Story[],
  sourceCounts?: Record<string, number>
): Story[] {
  const counts = sourceCounts ?? buildSourceCountMap(stories);

  return stories.map((story) => {
    const assessment = assessStrategicSignal(story);
    const key = normalizeHeadlineKey(story.headline);
    const sourceCount = counts[key] ?? 1;
    const withSignal: Story = {
      ...story,
      strategicSignal: assessment.strategicSignal,
      lowSignal: assessment.lowSignal,
    };
    const importanceScore = scoreStoryImportance(withSignal, { sourceCount });
    const importanceLabel = importanceLabelFromScore(
      importanceScore,
      sourceCount,
      assessment.lowSignal
    );

    return {
      ...withSignal,
      importanceScore,
      importanceLabel,
      importance: legacyImportanceFromLabel(importanceLabel),
    };
  });
}

export function compareByEditorialImportance(a: Story, b: Story): number {
  const corrDiff =
    (b.corroborationScore ?? 0) - (a.corroborationScore ?? 0);
  if (Math.abs(corrDiff) > 0.1) return corrDiff > 0 ? 1 : -1;

  const tierDiff = getStorySourceTier(a) - getStorySourceTier(b);
  if (tierDiff !== 0) return tierDiff < 0 ? 1 : -1;

  const clusterDiff = (b.clusterSize ?? 1) - (a.clusterSize ?? 1);
  if (clusterDiff !== 0) return clusterDiff > 0 ? 1 : -1;

  const stratDiff = getStrategicSignal(b) - getStrategicSignal(a);
  if (Math.abs(stratDiff) > 0.08) return stratDiff > 0 ? 1 : -1;

  const scoreDiff = (b.importanceScore ?? 0) - (a.importanceScore ?? 0);
  if (scoreDiff !== 0) return scoreDiff;

  return (
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function sortByEditorialImportance(stories: Story[]): Story[] {
  return [...stories].sort(compareByEditorialImportance);
}
