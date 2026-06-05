import "server-only";

import { BRIEFING_CORPUS_MIN } from "@/lib/briefing/briefing-corpus";
import type {
  BriefingCadence,
  CadenceBriefings,
  IntelligenceBriefing,
} from "@/lib/briefing/types";
import type { PlatformIntelligenceSnapshot } from "@/lib/persistence/intelligence-snapshot-persist";
import type { Story } from "@/lib/types";
import { briefingCorpusForCadence } from "@/lib/briefing/briefing-corpus";

export type BriefingProvenanceStats = {
  storiesProcessed: number;
  sourcesProcessed: number;
  narrativesProcessed: number;
  signalsProcessed: number;
};

export type BriefingProvenancePhase =
  | "generation"
  | "snapshot-write"
  | "snapshot-read"
  | "api-response"
  | "preserve-rejected"
  | "snapshot-read-rejected";

export function extractBriefingProvenanceStats(
  briefing: IntelligenceBriefing
): BriefingProvenanceStats {
  const p = briefing.provenance;
  return {
    storiesProcessed: p.storiesProcessed ?? p.articleCount ?? 0,
    sourcesProcessed: p.sourcesProcessed ?? p.sourceCount ?? 0,
    narrativesProcessed: p.narrativesProcessed ?? p.narrativeCount ?? 0,
    signalsProcessed: p.signalsProcessed ?? 0,
  };
}

/** True when briefing provenance meets minimum for cadence given available corpus. */
export function briefingMeetsCorpusThreshold(
  cadence: BriefingCadence,
  briefing: IntelligenceBriefing,
  corpusPoolSize: number
): boolean {
  const min = BRIEFING_CORPUS_MIN[cadence];
  const { storiesProcessed } = extractBriefingProvenanceStats(briefing);

  if (corpusPoolSize <= 1) return storiesProcessed >= 1;
  if (corpusPoolSize < min) return storiesProcessed >= corpusPoolSize;
  return storiesProcessed >= min;
}

export function logBriefingProvenance(
  phase: BriefingProvenancePhase,
  cadence: BriefingCadence,
  mode: string,
  briefing: IntelligenceBriefing,
  corpusPoolSize: number,
  extra?: Record<string, unknown>
): void {
  const stats = extractBriefingProvenanceStats(briefing);
  const meets = briefingMeetsCorpusThreshold(cadence, briefing, corpusPoolSize);
  const payload = {
    phase,
    cadence,
    mode,
    ...stats,
    corpusPool: corpusPoolSize,
    generatedBy: briefing.generatedBy,
    ...extra,
  };

  if (phase === "api-response") {
    console.log("[BRIEFING_VERIFY] render", JSON.stringify(payload));
  }

  if (!meets && corpusPoolSize > 1) {
    console.error("[BRIEFING_REGRESSION]", JSON.stringify(payload));
  } else {
    console.log("[BRIEFING_PROVENANCE]", JSON.stringify(payload));
  }
}

export function logCadenceBriefingsProvenance(
  phase: BriefingProvenancePhase,
  briefings: CadenceBriefings,
  corpus: Story[],
  extra?: Record<string, unknown>
): void {
  for (const cadence of ["daily", "weekly"] as const) {
    const poolSize = briefingCorpusForCadence(corpus, cadence).length;
    for (const mode of ["global", "for-you"] as const) {
      const briefing = briefings[cadence][mode];
      if (!briefing) continue;
      logBriefingProvenance(
        phase,
        cadence,
        mode,
        briefing,
        poolSize,
        extra
      );
    }
  }
}

export function logPlatformSnapshotWriteProvenance(
  snapshot: PlatformIntelligenceSnapshot,
  corpus: Story[]
): void {
  const dailyGlobal = snapshot.briefings.daily.global;
  const weeklyGlobal = snapshot.briefings.weekly.global;
  if (dailyGlobal) {
    logBriefingProvenance(
      "snapshot-write",
      "daily",
      "global",
      dailyGlobal,
      briefingCorpusForCadence(corpus, "daily").length
    );
  }
  if (weeklyGlobal) {
    logBriefingProvenance(
      "snapshot-write",
      "weekly",
      "global",
      weeklyGlobal,
      briefingCorpusForCadence(corpus, "weekly").length
    );
  }
}
