import type { BriefingCadence } from "@/lib/briefing/types";
import type { Story } from "@/lib/types";

const DAILY_WINDOW_MS = 48 * 60 * 60 * 1000;
const DAILY_STALE_MS = 20 * 60 * 60 * 1000;
const WEEKLY_STALE_MS = 6 * 24 * 60 * 60 * 1000;

export function filterStoriesForCadence(
  stories: Story[],
  cadence: BriefingCadence
): Story[] {
  if (cadence === "weekly") return stories;

  const cutoff = Date.now() - DAILY_WINDOW_MS;
  return stories.filter((s) => {
    const t = Date.parse(s.publishedAt);
    return Number.isFinite(t) && t >= cutoff;
  });
}

export function getPeriodLabel(cadence: BriefingCadence): string {
  const now = new Date();
  if (cadence === "daily") {
    return now.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(weekAgo)} – ${fmt(now)}`;
}

export function isCadenceStale(
  cadence: BriefingCadence,
  generatedAt: number | null | undefined
): boolean {
  if (!generatedAt) return true;
  const age = Date.now() - generatedAt;
  return cadence === "daily" ? age > DAILY_STALE_MS : age > WEEKLY_STALE_MS;
}

export function cadenceLabel(cadence: BriefingCadence): string {
  return cadence === "daily" ? "Daily Briefing" : "Weekly Briefing";
}
