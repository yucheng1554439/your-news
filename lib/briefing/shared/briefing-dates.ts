import type { IntelligenceBriefing } from "@/lib/briefing/types";
import { isSameUtcCalendarDay } from "@/lib/briefing/shared/coverage-period";

export function formatIntelligenceTimestamp(ms: number | null): string {
  if (!ms) return "Not generated yet";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ms));
}

function formatIntelligenceTimeOnly(ms: number): string {
  return new Intl.DateTimeFormat(undefined, {
    timeStyle: "short",
  }).format(new Date(ms));
}

export type BriefingDateDisplay = {
  /** Primary line under mode label — corpus coverage day or range */
  coverageLine: string;
  /** Secondary line — generation / refresh time; full date when coverage day differs */
  lastUpdatedLine: string | null;
};

/**
 * Coverage date = corpus period. Last updated = generation / snapshot refresh.
 * Avoids showing conflicting calendar days without labels.
 */
export function resolveBriefingDateDisplay(
  briefing: IntelligenceBriefing,
  intelligenceUpdatedAt: number | null
): BriefingDateDisplay {
  const periodLabel = (briefing.periodLabel ?? briefing.weekLabel ?? "").trim();
  const lastUpdated =
    intelligenceUpdatedAt ?? briefing.generatedAt ?? null;
  const coverageDateMs = briefing.coverageDateMs;

  if (!periodLabel && !lastUpdated) {
    return { coverageLine: "", lastUpdatedLine: null };
  }

  if (!lastUpdated) {
    return {
      coverageLine: periodLabel ? `Coverage · ${periodLabel}` : "",
      lastUpdatedLine: null,
    };
  }

  const sameDay =
    coverageDateMs != null &&
    isSameUtcCalendarDay(coverageDateMs, lastUpdated);

  if (sameDay && periodLabel) {
    return {
      coverageLine: periodLabel,
      lastUpdatedLine: `Last updated ${formatIntelligenceTimeOnly(lastUpdated)}`,
    };
  }

  return {
    coverageLine: periodLabel ? `Coverage · ${periodLabel}` : "",
    lastUpdatedLine: `Last updated ${formatIntelligenceTimestamp(lastUpdated)}`,
  };
}
