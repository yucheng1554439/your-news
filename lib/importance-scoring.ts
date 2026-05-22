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

const CATEGORY_WEIGHT: Record<StoryCategory, number> = {
  geopolitics: 0.95,
  markets: 0.9,
  ai: 0.88,
  policy: 0.85,
  energy: 0.82,
  cybersecurity: 0.8,
  technology: 0.75,
  startups: 0.7,
  developer: 0.55,
};

const MARKET_KEYWORDS =
  /\b(market|stock|fed|inflation|gdp|earnings|trade|bank|invest|economy|recession|rate|ipo|bond|commodity|oil price)\b/i;

const GEOPOLITICAL_KEYWORDS =
  /\b(war|geopolit|china|taiwan|nato|military|sanction|diplomat|conflict|ukraine|israel|election|president|congress|eu\b|brexit)\b/i;

const AI_KEYWORDS =
  /\b(ai\b|artificial intelligence|openai|anthropic|llm|machine learning|model|chip|nvidia|generative|automation)\b/i;

export function normalizeHeadlineKey(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 80);
}

export function computeRecencyScore(publishedAt: string, now = Date.now()): number {
  const published = new Date(publishedAt).getTime();
  if (Number.isNaN(published)) return 0.4;

  const ageMs = Math.max(0, now - published);
  if (ageMs <= 6 * MS_PER_HOUR) return 1;
  if (ageMs <= MS_PER_DAY) return 0.85;
  if (ageMs <= 3 * MS_PER_DAY) return 0.65;
  if (ageMs <= 7 * MS_PER_DAY) return 0.45;
  return 0.25;
}

export function computeSourceCountScore(sourceCount: number): number {
  if (sourceCount >= 4) return 1;
  if (sourceCount === 3) return 0.85;
  if (sourceCount === 2) return 0.65;
  return 0.35;
}

export function computeCategoryImportance(category: StoryCategory): number {
  return CATEGORY_WEIGHT[category] ?? 0.6;
}

export function computeMarketRelevance(story: Story): number {
  const blob = `${story.headline} ${story.summary} ${story.economicImplications ?? ""}`;
  let score = story.category === "markets" || story.category === "energy" ? 0.75 : 0.2;
  if (MARKET_KEYWORDS.test(blob)) score = Math.min(1, score + 0.35);
  if (story.economicImplications) score = Math.min(1, score + 0.15);
  return score;
}

export function computeGeopoliticalSignificance(story: Story): number {
  const blob = `${story.headline} ${story.summary}`;
  let score = story.category === "geopolitics" || story.category === "policy" ? 0.8 : 0.15;
  if (GEOPOLITICAL_KEYWORDS.test(blob)) score = Math.min(1, score + 0.4);
  return score;
}

export function computeAiSignificance(story: Story): number {
  const blob = `${story.headline} ${story.summary}`;
  let score =
    story.category === "ai" || story.category === "technology" ? 0.85 : 0.2;
  if (AI_KEYWORDS.test(blob)) score = Math.min(1, score + 0.35);
  return score;
}

export function scoreStoryImportance(
  story: Story,
  signals: ImportanceScoreSignals = {}
): number {
  const sourceCount = signals.sourceCount ?? 1;

  const weighted =
    computeRecencyScore(story.publishedAt) * 0.22 +
    computeSourceCountScore(sourceCount) * 0.18 +
    computeMarketRelevance(story) * 0.16 +
    computeGeopoliticalSignificance(story) * 0.14 +
    computeAiSignificance(story) * 0.14 +
    computeCategoryImportance(story.category) * 0.16;

  const raw = 1 + weighted * 9;
  return Math.round(Math.min(10, Math.max(1, raw)));
}

/** Critical is reserved for exceptional stories — used in ranking and rare UI. */
export function importanceLabelFromScore(
  score: number,
  sourceCount = 1
): EditorialImportanceLabel {
  if (score >= 9 && sourceCount >= 2) return "Critical";
  if (score >= 7) return "High";
  if (score >= 4) return "Moderate";
  return "Low";
}

/** Only the rarest stories surface a Critical badge in the UI. */
export function isCriticalForDisplay(story: Story): boolean {
  return (
    story.importanceLabel === "Critical" &&
    (story.importanceScore ?? 0) >= 9
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
    const key = normalizeHeadlineKey(story.headline);
    const sourceCount = counts[key] ?? 1;
    const importanceScore = scoreStoryImportance(story, { sourceCount });
    const importanceLabel = importanceLabelFromScore(
      importanceScore,
      sourceCount
    );

    return {
      ...story,
      importanceScore,
      importanceLabel,
      importance: legacyImportanceFromLabel(importanceLabel),
    };
  });
}

export function compareByEditorialImportance(a: Story, b: Story): number {
  const scoreDiff = (b.importanceScore ?? 0) - (a.importanceScore ?? 0);
  if (scoreDiff !== 0) return scoreDiff;
  return (
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function sortByEditorialImportance(stories: Story[]): Story[] {
  return [...stories].sort(compareByEditorialImportance);
}
