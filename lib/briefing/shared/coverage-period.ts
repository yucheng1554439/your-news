import type { BriefingCadence } from "@/lib/briefing/types";
import type { Story } from "@/lib/types";

export type CoveragePeriod = {
  /** User-facing coverage stamp, e.g. "Wed, Jun 3" or "Jun 1 – Jun 7" */
  label: string;
  /** UTC midnight ms for the primary coverage day (newest story day for daily). */
  coverageDateMs: number;
};

export function startOfUtcDay(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function formatDayLabel(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatShortDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function publishedTimes(stories: Story[]): number[] {
  return stories
    .map((s) => Date.parse(s.publishedAt))
    .filter((t) => Number.isFinite(t));
}

/** Coverage period derived from synthesis corpus — not wall-clock "today". */
export function deriveCoveragePeriodLabel(
  stories: Story[],
  cadence: BriefingCadence
): CoveragePeriod {
  const times = publishedTimes(stories);
  const now = Date.now();

  if (times.length === 0) {
    return {
      label: formatDayLabel(now),
      coverageDateMs: startOfUtcDay(now),
    };
  }

  const latest = Math.max(...times);
  const earliest = Math.min(...times);

  if (cadence === "weekly") {
    const start = startOfUtcDay(earliest);
    const end = startOfUtcDay(latest);
    const label =
      start === end
        ? formatDayLabel(end)
        : `${formatShortDate(start)} – ${formatShortDate(end)}`;
    return { label, coverageDateMs: end };
  }

  const coverageDateMs = startOfUtcDay(latest);
  return {
    label: formatDayLabel(coverageDateMs),
    coverageDateMs,
  };
}

export function isSameUtcCalendarDay(aMs: number, bMs: number): boolean {
  return startOfUtcDay(aMs) === startOfUtcDay(bMs);
}
