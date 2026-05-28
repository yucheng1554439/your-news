import "server-only";

import type { WeeklyBriefing } from "@/lib/briefing/weekly-engine";
import { PERSIST_KEYS } from "@/lib/persistence/keys";
import {
  readIntelligenceMeta,
  writeIntelligenceMeta,
} from "@/lib/persistence/intelligence-meta-persist";
import { persistGet, persistSet } from "@/lib/persistence/kv-store";
import type { Story } from "@/lib/types";

export type PlatformIntelligenceSnapshot = {
  version: 2;
  updatedAt: number;
  storiesFetchedAt: number;
  profileFingerprint: string;
  enrichedBySlug: Record<string, Story>;
  briefings: Partial<Record<"for-you" | "global", WeeklyBriefing>>;
};

export async function readPlatformIntelligenceSnapshot(): Promise<PlatformIntelligenceSnapshot | null> {
  const snapshot = await persistGet<PlatformIntelligenceSnapshot>(
    PERSIST_KEYS.intelligenceSnapshot
  );
  if (snapshot?.version === 2) return snapshot;
  return null;
}

export async function writePlatformIntelligenceSnapshot(
  snapshot: PlatformIntelligenceSnapshot
): Promise<boolean> {
  const result = await persistSet(PERSIST_KEYS.intelligenceSnapshot, snapshot);

  if (!result.ok) {
    console.error(
      `[PERSIST] Intelligence snapshot write FAILED: ${result.error ?? "unknown"}`
    );
    return false;
  }

  await writeIntelligenceMeta({
    lastSuccessfulRefreshAt: snapshot.updatedAt,
    lastRefreshAttemptAt: snapshot.updatedAt,
    storiesFetchedAt: snapshot.storiesFetchedAt,
    storyCount: Object.keys(snapshot.enrichedBySlug).length,
    profileFingerprint: snapshot.profileFingerprint,
    backend: result.backend,
  });

  console.log(
    `[PERSIST] Intelligence snapshot saved (${result.backend}) — ${Object.keys(snapshot.enrichedBySlug).length} stories, updated ${new Date(snapshot.updatedAt).toISOString()}`
  );
  return true;
}

export async function recordRefreshAttempt(
  profileFingerprint: string
): Promise<void> {
  const existing = await readIntelligenceMeta();
  await writeIntelligenceMeta({
    lastSuccessfulRefreshAt: existing?.lastSuccessfulRefreshAt ?? 0,
    lastRefreshAttemptAt: Date.now(),
    storiesFetchedAt: existing?.storiesFetchedAt ?? 0,
    storyCount: existing?.storyCount ?? 0,
    profileFingerprint,
    backend: existing?.backend ?? "none",
  });
}
