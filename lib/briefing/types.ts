import type { IntelligenceGeneratedBy } from "@/lib/intelligence/types";
import {
  stripBriefingDiagnostics,
} from "@/lib/briefing/weekly-rescue";

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
};

export type IntelligenceBriefing = {
  cadence: BriefingCadence;
  mode: BriefingMode;
  periodLabel: string;
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

export type BriefingBundle = Partial<
  Record<BriefingMode, IntelligenceBriefing>
>;

export type CadenceBriefings = {
  daily: BriefingBundle;
  weekly: BriefingBundle;
};

export function normalizeBriefing(
  briefing: IntelligenceBriefing,
  defaultCadence: BriefingCadence = "weekly"
): IntelligenceBriefing {
  const cadence = briefing.cadence ?? defaultCadence;
  const periodLabel =
    briefing.periodLabel ?? briefing.weekLabel ?? "";

  return stripBriefingDiagnostics({
    ...briefing,
    cadence,
    mode: briefing.mode ?? "global",
    periodLabel,
    weekLabel: periodLabel,
    provenance: briefing.provenance ?? {
      articleCount: 0,
      narrativeCount: 0,
      sourceCount: 0,
      sources: [],
    },
    summary: briefing.summary ?? "",
    keySignal: briefing.keySignal ?? "",
    headline: briefing.headline ?? "",
  });
}

export function briefingMatchesCadence(
  briefing: IntelligenceBriefing | undefined,
  mode: BriefingMode,
  cadence: BriefingCadence
): boolean {
  if (!briefing || briefing.mode !== mode) return false;
  const bCadence = briefing.cadence ?? "weekly";
  return bCadence === cadence;
}
