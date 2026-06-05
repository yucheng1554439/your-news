import "server-only";

import type { BriefingCadence } from "@/lib/briefing/types";
import type { Story } from "@/lib/types";

export {
  cadenceLabel,
  getCoveragePeriodFromCorpus,
  getPeriodLabel,
} from "@/lib/briefing/shared/cadence";

const DAILY_WINDOW_MS = 48 * 60 * 60 * 1000;
const WEEKLY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const DAILY_STALE_MS = 20 * 60 * 60 * 1000;
const WEEKLY_STALE_MS = 6 * 24 * 60 * 60 * 1000;

export function filterStoriesForCadence(
  stories: Story[],
  cadence: BriefingCadence
): Story[] {
  const cutoff =
    cadence === "weekly"
      ? Date.now() - WEEKLY_WINDOW_MS
      : Date.now() - DAILY_WINDOW_MS;

  return stories.filter((s) => {
    const t = Date.parse(s.publishedAt);
    return Number.isFinite(t) && t >= cutoff;
  });
}

export function isCadenceStale(
  cadence: BriefingCadence,
  generatedAt: number | null | undefined
): boolean {
  if (!generatedAt) return true;
  const age = Date.now() - generatedAt;
  return cadence === "daily" ? age > DAILY_STALE_MS : age > WEEKLY_STALE_MS;
}
