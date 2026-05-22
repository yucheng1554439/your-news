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
  whyItMatters: string;
  /** Profile-specific interpretation (detail view). */
  whyItMattersToYou?: string;
  economicImplications?: string;
  perspectives?: string;
  marketReaction?: string;
  sourceContext?: string;
  category: StoryCategory;
  tags: string[];
  importance: Importance;
  /** Editorial strategic importance (1–10). */
  importanceScore?: number;
  importanceLabel?: EditorialImportanceLabel;
  imageUrl: string;
  publishedAt: string;
  source: string;
  sourceUrl?: string;
  readTime: number;
  timeline?: TimelineEvent[];
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
