import type { IntelligenceGeneratedBy } from "@/lib/intelligence/types";

export type { IntelligenceGeneratedBy };

export type BriefingCadence = "daily" | "weekly";
export type BriefingMode = "for-you" | "global";

/** @deprecated Use BriefingMode */
export type WeeklyBriefingMode = BriefingMode;

export type BriefingProvenance = {
  articleCount: number;
  narrativeCount: number;
  sourceCount: number;
  /** Distinct outlet names, tier-1 first */
  sources: string[];
  /** Articles passed into synthesis / LLM */
  storiesProcessed?: number;
  /** Distinct sources in synthesis material */
  sourcesProcessed?: number;
  /** Narrative clusters in synthesis material */
  narrativesProcessed?: number;
  /** Active desk signals represented in synthesis corpus */
  signalsProcessed?: number;
};

export type IntelligenceBriefing = {
  cadence: BriefingCadence;
  mode: BriefingMode;
  periodLabel: string;
  /** UTC midnight ms for primary coverage day (from corpus, not refresh time). */
  coverageDateMs?: number;
  headline: string;
  /** Legacy flat body — prefer structured sections when present */
  summary: string;
  keySignal: string;
  provenance: BriefingProvenance;
  whatChanged?: string;
  whyYou?: string;
  whyItMatters?: string;
  watchItems?: string[];
  positioning?: string;
  /** For You: decisions this may influence */
  decisions?: string;
  /** For You: what would invalidate the read */
  invalidateIf?: string;
  generatedBy: IntelligenceGeneratedBy;
  generatedAt?: number;
  aiError?: string;
  /** @deprecated Use aiError */
  openaiError?: string;
  /** @deprecated Use periodLabel */
  weekLabel?: string;
};

/** @deprecated Use IntelligenceBriefing */
export type WeeklyBriefing = IntelligenceBriefing;

/** For You + Global intelligence briefings exposed to clients. */
export type BriefingBundle = Partial<
  Record<BriefingMode, IntelligenceBriefing>
>;

/** Internal persistence shape — only `daily` is populated after refresh. */
export type CadenceBriefings = {
  daily: BriefingBundle;
  weekly: BriefingBundle;
};
