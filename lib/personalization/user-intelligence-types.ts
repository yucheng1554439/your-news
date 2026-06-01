/** Serializable user intelligence — safe for client + server. */

export type ThemeWeight = {
  theme: string;
  label: string;
  score: number;
  sources: ("saved" | "open" | "category" | "interest" | "tag")[];
};

export type TagWeight = {
  tag: string;
  label: string;
  score: number;
};

export type SecondaryTagWeight = {
  label: string;
  score: number;
};

export type EntityWeight = {
  id: string;
  label: string;
  score: number;
};

export type UserIntelligenceProfile = {
  /** Stable identity — onboarding interests + career + sustained behavior */
  primaryThemes: ThemeWeight[];
  /** Recent opens — adjustment layer only */
  secondaryThemes: ThemeWeight[];
  /** @deprecated alias for primaryThemes */
  topThemes: ThemeWeight[];
  /** @deprecated alias */
  dominantThemes: ThemeWeight[];
  primaryTags: TagWeight[];
  secondaryTags: TagWeight[];
  /** @deprecated alias for primaryTags */
  topTags: TagWeight[];
  topSecondaryTags: SecondaryTagWeight[];
  topCategories: { category: string; label: string; score: number }[];
  primaryEntities: EntityWeight[];
  secondaryEntities: EntityWeight[];
  /** @deprecated alias for primaryEntities */
  topEntities: EntityWeight[];
  ignoredThemes: string[];
  ignoredCategories: string[];
  emergingInterests: string[];
  effectiveLens: string;
  /** 0–1 trust in behavioral signals vs onboarding */
  behaviorConfidence: number;
  /** 0–1 blend weight applied to ranking (derived from confidence) */
  behaviorWeight: number;
  savedSlugs: string[];
  openedSlugs: string[];
  refreshCount: number;
  totalDwellMs: number;
  sessionCount: number;
  /** Slugs flagged off-profile by AI intelligence */
  aiIrrelevantSlugs?: Record<string, number>;
};
