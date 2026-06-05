import type { IntelligenceBriefing } from "@/types";

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

function startOfUtcDay(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export type BriefingDateDisplay = {
  coverageLine: string;
  lastUpdatedLine: string | null;
};

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
    startOfUtcDay(coverageDateMs) === startOfUtcDay(lastUpdated);

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
