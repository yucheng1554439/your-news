export type StoryCategory =
  | "ai"
  | "markets"
  | "energy"
  | "geopolitics"
  | "cybersecurity"
  | "startups"
  | "policy"
  | "developer"
  | "technology";

export type Importance = "critical" | "high" | "medium";

export type EditorialImportanceLabel =
  | "Critical"
  | "High"
  | "Moderate"
  | "Low";

export interface TimelineEvent {
  date: string;
  event: string;
}

export interface Story {
  slug: string;
  headline: string;
  summary: string;
  /** Original NewsAPI description/content for AI analysis. */
  rawExcerpt?: string;
  /** Full NewsAPI content field when available (may be truncated). */
  newsApiContent?: string;
  /** Extracted full article text for intelligence (URL → parse → clean). */
  articleBody?: string;
  articleBodySource?: "url" | "newsapi" | "excerpt";
  whyItMatters: string;
  /** Profile-specific interpretation (detail view). */
  whyItMattersToYou?: string;
  /** What to monitor next — personalized signal. */
  nextWatch?: string;
  economicImplications?: string;
  perspectives?: string;
  marketReaction?: string;
  sourceContext?: string;
  category: StoryCategory;
  /** Primary + cross-domain thematic tags (markets, semiconductors, etc.). */
  tags: string[];
  importance: Importance;
  /** Profile-aware score (1–10) when computed for ranking/display. */
  personalizedImportanceScore?: number;
  personalizedImportanceLabel?: EditorialImportanceLabel;
  /** Editorial strategic importance (1–10). */
  importanceScore?: number;
  importanceLabel?: EditorialImportanceLabel;
  /** 0–1 strategic signal (macro/policy/tech/markets relevance). */
  strategicSignal?: number;
  /** Consumer promo, gaming merch, sports fluff, etc. */
  lowSignal?: boolean;
  /** 1 = wire/papers of record, 2 = trade press, 3 = promo/blogs. */
  sourceTier?: 1 | 2 | 3;
  narrativeClusterId?: string;
  narrativeTheme?: string;
  narrativeEntities?: string[];
  clusterSize?: number;
  /** 0–1 cross-outlet confirmation within cluster. */
  corroborationScore?: number;
  isClusterRepresentative?: boolean;
  imageUrl: string;
  publishedAt: string;
  source: string;
  sourceUrl?: string;
  readTime: number;
  timeline?: TimelineEvent[];
  /** Set when intelligence layer runs (Claude, OpenAI, or template fallback). */
  intelligenceGeneratedBy?: "anthropic" | "openai" | "fallback";
  intelligenceAiError?: string;
  /** @deprecated Use intelligenceAiError */
  intelligenceOpenaiError?: string;
}

export type Career =
  | "engineer"
  | "investor"
  | "founder"
  | "executive"
  | "researcher";

export type FocusType = "breadth" | "depth" | "breaking";

export type Tone = "analytical" | "concise" | "narrative";

export interface OnboardingProfile {
  interests: string[];
  career: Career | null;
  focusType: FocusType | null;
  tone: Tone | null;
  completed: boolean;
  /** Unix ms — used to reconcile local vs Clerk copies. */
  updatedAt?: number;
}
