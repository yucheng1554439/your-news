import "server-only";

import {
  verifyIntelligenceMatch,
  logIntelligenceMismatch,
} from "@/lib/intelligence/provenance";
import type {
  CadenceBriefings,
  IntelligenceBriefing,
} from "@/lib/briefing/types";
import { normalizeBriefing } from "@/lib/briefing/shared/normalize";
import { PERSIST_KEYS } from "@/lib/persistence/keys";
import {
  readIntelligenceMeta,
  writeIntelligenceMeta,
} from "@/lib/persistence/intelligence-meta-persist";
import { persistGet, persistSet } from "@/lib/persistence/kv-store";
import { getActiveModel } from "@/lib/intelligence/provider/config";
import type { Story } from "@/lib/types";

export type PlatformIntelligenceSnapshot = {
  version: 4;
  aiModel: string;
  updatedAt: number;
  storiesFetchedAt: number;
  profileFingerprint: string;
  enrichedBySlug: Record<string, Story>;
  cadenceUpdatedAt: {
    daily: number;
    weekly: number;
  };
  briefings: CadenceBriefings;
};

function normalizeBundle(
  bundle: CadenceBriefings["daily"] | undefined,
  defaultCadence: "daily" | "weekly"
): CadenceBriefings["daily"] {
  if (!bundle) return {};
  const out: CadenceBriefings["daily"] = {};
  for (const mode of ["for-you", "global"] as const) {
    const b = bundle[mode];
    if (b) out[mode] = normalizeBriefing(b, defaultCadence);
  }
  return out;
}

function normalizeSnapshot(
  snapshot: PlatformIntelligenceSnapshot
): PlatformIntelligenceSnapshot {
  return {
    ...snapshot,
    briefings: {
      daily: normalizeBundle(snapshot.briefings.daily, "daily"),
      weekly: normalizeBundle(snapshot.briefings.weekly, "weekly"),
    },
  };
}

function migrateV3ToV4(
  raw: Record<string, unknown>
): PlatformIntelligenceSnapshot | null {
  if (raw.version !== 3) return null;
  const legacy = raw.briefings as CadenceBriefings["weekly"] | undefined;
  const updatedAt = (raw.updatedAt as number) ?? Date.now();
  return normalizeSnapshot({
    version: 4,
    aiModel: (raw.aiModel as string) ?? getActiveModel(),
    updatedAt,
    storiesFetchedAt: (raw.storiesFetchedAt as number) ?? updatedAt,
    profileFingerprint: (raw.profileFingerprint as string) ?? "anon",
    enrichedBySlug: (raw.enrichedBySlug as Record<string, Story>) ?? {},
    cadenceUpdatedAt: { daily: 0, weekly: updatedAt },
    briefings: {
      daily: {},
      weekly: legacy ?? {},
    },
  });
}

export async function readPlatformIntelligenceSnapshot(): Promise<PlatformIntelligenceSnapshot | null> {
  const snapshot = await persistGet<
    PlatformIntelligenceSnapshot | Record<string, unknown>
  >(PERSIST_KEYS.intelligenceSnapshot);

  if (!snapshot) return null;

  let normalized: PlatformIntelligenceSnapshot | null = null;
  if (snapshot.version === 4) {
    normalized = normalizeSnapshot(snapshot as PlatformIntelligenceSnapshot);
  } else {
    normalized = migrateV3ToV4(snapshot as Record<string, unknown>);
  }

  if (!normalized) return null;
  if (normalized.aiModel !== getActiveModel()) return null;
  return normalized;
}

export async function writePlatformIntelligenceSnapshot(
  snapshot: PlatformIntelligenceSnapshot
): Promise<boolean> {
  const payload = normalizeSnapshot(snapshot);
  const result = await persistSet(PERSIST_KEYS.intelligenceSnapshot, payload);

  if (!result.ok) {
    console.error(
      `[PERSIST] Intelligence snapshot write FAILED: ${result.error ?? "unknown"}`
    );
    console.log("[WEEKLY] snapshot write failed");
    return false;
  }

  await writeIntelligenceMeta({
    aiModel: payload.aiModel,
    lastSuccessfulRefreshAt: payload.updatedAt,
    lastRefreshAttemptAt: payload.updatedAt,
    storiesFetchedAt: payload.storiesFetchedAt,
    storyCount: Object.keys(payload.enrichedBySlug).length,
    profileFingerprint: payload.profileFingerprint,
    backend: result.backend,
  });

  console.log(
    `[PERSIST] Intelligence snapshot saved (${result.backend}) — global briefings + ${Object.keys(payload.enrichedBySlug).length} stories`
  );
  console.log(
    `[SNAPSHOT_SCOPE] global key=${PERSIST_KEYS.intelligenceSnapshot}`
  );
  console.log("[WEEKLY] snapshot write succeeded");
  return true;
}

/** Merge one story into the persisted platform snapshot (on-demand backfill). */
export async function upsertStoryInPlatformSnapshot(
  story: Story
): Promise<boolean> {
  const existing = await readPlatformIntelligenceSnapshot();
  if (!existing) return false;

  const match = verifyIntelligenceMatch(story, story);
  if (!match.match) {
    logIntelligenceMismatch("upsertStoryInPlatformSnapshot", match);
    return false;
  }

  return writePlatformIntelligenceSnapshot({
    ...existing,
    enrichedBySlug: {
      ...existing.enrichedBySlug,
      [story.slug]: story,
    },
  });
}

export async function recordRefreshAttempt(
  profileFingerprint: string
): Promise<void> {
  const existing = await readIntelligenceMeta();
  await writeIntelligenceMeta({
    aiModel: getActiveModel(),
    lastSuccessfulRefreshAt: existing?.lastSuccessfulRefreshAt ?? 0,
    lastRefreshAttemptAt: Date.now(),
    storiesFetchedAt: existing?.storiesFetchedAt ?? 0,
    storyCount: existing?.storyCount ?? 0,
    profileFingerprint,
    backend: existing?.backend ?? "none",
  });
}
