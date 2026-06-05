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

export type EditorialImportanceLabel =
  | "Critical"
  | "High"
  | "Medium"
  | "Low";

export interface Story {
  slug: string;
  headline: string;
  summary: string;
  whyItMatters: string;
  whyItMattersToYou?: string;
  nextWatch?: string;
  category: StoryCategory;
  secondaryTags?: string[];
  strategicTags?: string[];
  tags: string[];
  importanceScore?: number;
  importanceLabel?: EditorialImportanceLabel;
  personalizedImportanceScore?: number;
  personalizedImportanceLabel?: EditorialImportanceLabel;
  strategicSignal?: number;
  corroborationScore?: number;
  clusterSize?: number;
  narrativeTheme?: string;
  narrativeClusterId?: string;
  paywallDetected?: boolean;
  signalSummaryDisclaimer?: string;
  corroboratingSlugs?: string[];
  intelligenceGeneratedBy?: "anthropic" | "openai" | "fallback" | "metadata";
  imageUrl: string;
  publishedAt: string;
  source: string;
  sourceUrl?: string;
  readTime: number;
}

export type TopicPreferences = {
  moreOf: string[];
  lessOf: string[];
  neverShow: string[];
};

export interface OnboardingProfile {
  interests: string[];
  career: string | null;
  focusType: string | null;
  tone: string | null;
  completed: boolean;
  topicPreferences?: TopicPreferences;
}

export type UserIntelligenceProfile = {
  effectiveLens: string;
  behaviorConfidence: number;
  behaviorWeight: number;
  savedSlugs: string[];
  openedSlugs?: string[];
  primaryThemes?: { label: string; theme: string }[];
  topThemes?: { label: string; theme: string }[];
  primaryTags?: { tag: string; label: string }[];
  topTags?: { tag: string; label: string }[];
  topSecondaryTags?: { label: string }[];
  topicPreferencesMore?: string[];
  topicPreferencesLess?: string[];
  topicPreferencesNever?: string[];
  ignoredThemes: string[];
  ignoredCategories: string[];
};

export type BriefingCadence = "daily" | "weekly";
export type BriefingMode = "for-you" | "global";

export type IntelligenceBriefing = {
  cadence: BriefingCadence;
  mode: BriefingMode;
  periodLabel: string;
  coverageDateMs?: number;
  generatedAt?: number;
  headline: string;
  summary: string;
  keySignal: string;
  whatChanged?: string;
  whyYou?: string;
  whyItMatters?: string;
  watchItems?: string[];
  positioning?: string;
  decisions?: string;
  invalidateIf?: string;
  provenance: {
    articleCount: number;
    narrativeCount: number;
    sourceCount: number;
    sources: string[];
    storiesProcessed?: number;
    sourcesProcessed?: number;
    narrativesProcessed?: number;
    signalsProcessed?: number;
  };
  generatedBy: string;
  aiError?: string;
  weekLabel?: string;
};

export type BriefingBundle = Partial<Record<BriefingMode, IntelligenceBriefing>>;

export type DashboardPayload = {
  ok: true;
  version: "v1";
  profile: OnboardingProfile | null;
  stories: Story[];
  globalStories: Story[];
  userIntelligence: UserIntelligenceProfile | null;
  briefings: BriefingBundle;
  sections: {
    leadSlug: string | null;
    relevantSlugs: string[];
    topSlugs: string[];
    moreStoriesSlugs: string[];
  };
  meta: {
    fetchedAt: number;
    intelligenceUpdatedAt: number | null;
    hasIntelligenceSnapshot: boolean;
    persistenceConfigured: boolean;
    cacheStatus: string;
    feedError: string | null;
    fromPersistentStore: boolean;
  };
};
