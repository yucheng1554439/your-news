import type {
  BriefingCadence,
  BriefingMode,
  IntelligenceBriefing,
} from "@/lib/briefing/types";
import { stripBriefingDiagnostics } from "@/lib/briefing/shared/diagnostics";

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
