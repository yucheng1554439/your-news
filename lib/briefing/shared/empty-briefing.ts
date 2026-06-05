import { intelligencePeriodLabel } from "@/lib/briefing/shared/labels";
import type { BriefingMode, IntelligenceBriefing } from "@/lib/briefing/types";

/** Client-safe placeholder when no server briefing snapshot is available. */
export function emptyBriefing(mode: BriefingMode): IntelligenceBriefing {
  const periodLabel = intelligencePeriodLabel();
  return {
    cadence: "daily",
    mode,
    periodLabel,
    weekLabel: periodLabel,
    headline: "",
    summary: "",
    keySignal: "",
    provenance: {
      articleCount: 0,
      narrativeCount: 0,
      sourceCount: 0,
      sources: [],
    },
    generatedBy: "fallback",
  };
}
