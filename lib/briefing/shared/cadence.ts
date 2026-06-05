import type { BriefingCadence } from "@/lib/briefing/types";
import type { Story } from "@/lib/types";
import { deriveCoveragePeriodLabel } from "@/lib/briefing/shared/coverage-period";

/** @deprecated Prefer deriveCoveragePeriodLabel(corpus, cadence) for persisted briefings. */
export function getPeriodLabel(cadence: BriefingCadence): string {
  return deriveCoveragePeriodLabel([], cadence).label;
}

export function getCoveragePeriodFromCorpus(
  stories: Story[],
  cadence: BriefingCadence
): { periodLabel: string; coverageDateMs: number } {
  const period = deriveCoveragePeriodLabel(stories, cadence);
  return {
    periodLabel: period.label,
    coverageDateMs: period.coverageDateMs,
  };
}

export function cadenceLabel(cadence: BriefingCadence): string {
  return cadence === "daily" ? "Daily Briefing" : "Weekly Briefing";
}
