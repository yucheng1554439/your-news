import "server-only";

import type { WeeklyBriefing } from "@/lib/briefing/weekly-engine";
import { weeklyBriefingKey } from "@/lib/persistence/keys";
import { persistGet, persistSet } from "@/lib/persistence/kv-store";

/** Briefings persist until manual refresh (long TTL for Redis eviction only). */
const WEEKLY_TTL_SECONDS = 7 * 24 * 60 * 60;

type PersistedWeeklyEntry = {
  generatedAt: string;
  briefing: WeeklyBriefing;
};

export async function readPersistedWeeklyBriefing(
  cacheKey: string
): Promise<WeeklyBriefing | null> {
  const key = weeklyBriefingKey(cacheKey);
  const entry = await persistGet<PersistedWeeklyEntry>(key);
  return entry?.briefing ?? null;
}

export async function writePersistedWeeklyBriefing(
  cacheKey: string,
  briefing: WeeklyBriefing
): Promise<boolean> {
  const key = weeklyBriefingKey(cacheKey);
  const entry: PersistedWeeklyEntry = {
    generatedAt: new Date().toISOString(),
    briefing,
  };

  const result = await persistSet(key, entry, { exSeconds: WEEKLY_TTL_SECONDS });
  if (!result.ok) {
    console.warn(
      `[PERSIST] Weekly briefing write failed for ${cacheKey}: ${result.error}`
    );
  }
  return result.ok;
}
