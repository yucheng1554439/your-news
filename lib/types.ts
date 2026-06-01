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
  | "Medium"
  | "Low";

export type SignalClass = "signal" | "noise";

export interface TimelineEvent {
  date: string;
  event: string;
}

export interface ClusterSource {
  name: string;
  tier: 1 | 2 | 3;
  url?: string;
  slug: string;
  publishedAt: string;
}

/** Narrative event used by briefings and story intelligence (not homepage UI). */
export interface ClusterIntelligence {
  id: string;
  theme: string;
  title: string;
  summary: string;
  sources: ClusterSource[];
  articleCount: number;
  sourceCount: number;
  importance: Importance;
  importanceScore: number;
  importanceLabel?: EditorialImportanceLabel;
  tags: string[];
  entities: string[];
  timeline: TimelineEvent[];
  corroborationScore: number;
  representativeSlug: string;
  representative: Story;
  stories: Story[];
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
  /** Publisher page blocked — intelligence uses metadata + corroboration only. */
  paywallDetected?: boolean;
  /** Extracted publisher/newsapi body is long enough for full AI intelligence. */
  articleBodyAvailable?: boolean;
  /** Fixed disclaimer when paywallDetected. */
  signalSummaryDisclaimer?: string;
  /** Other pool stories used to corroborate a paywalled item. */
  corroboratingSlugs?: string[];
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
  /** Editorial primary lane (same as category). */
  primaryCategory?: StoryCategory;
  /** Entities, locations, companies, topics — human-readable. */
  secondaryTags?: string[];
  /** Strategic / thematic lanes (semiconductors, supply-chain, markets, …). */
  strategicTags?: string[];
  /** Union of primary + strategic + secondary (legacy matching). */
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
  /** Signal vs noise — noise is downranked from lead, briefings, and Critical. */
  signalClass?: SignalClass;
  /** 1 = wire/papers of record, 2 = trade press, 3 = promo/blogs. */
  sourceTier?: 1 | 2 | 3;
  narrativeClusterId?: string;
  narrativeTheme?: string;
  narrativeEntities?: string[];
  clusterSize?: number;
  /** 0–1 cross-outlet confirmation within cluster. */
  corroborationScore?: number;
  isClusterRepresentative?: boolean;
  /** Event title when this card represents a multi-source cluster. */
  clusterEventTitle?: string;
  clusterSourceCount?: number;
  clusterArticleCount?: number;
  clusterSourceNames?: string[];
  clusterSlugs?: string[];
  imageUrl: string;
  publishedAt: string;
  source: string;
  sourceUrl?: string;
  readTime: number;
  timeline?: TimelineEvent[];
  /** Set when intelligence layer runs (Claude, OpenAI, or template fallback). */
  intelligenceGeneratedBy?: "anthropic" | "openai" | "fallback" | "metadata";
  intelligenceAiError?: string;
  /** @deprecated Use intelligenceAiError */
  intelligenceOpenaiError?: string;
  /** Provenance — intelligence must match these before display. */
  intelligenceAnchorSlug?: string;
  intelligenceAnchorHeadline?: string;
  intelligenceMaterialSlugs?: string[];
  intelligenceFingerprint?: string;
  intelligenceClusterId?: string;
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
