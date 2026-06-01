import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { classifyPersistenceError } from "@/lib/clerk/classify-persistence-error";
import { userProfileKey } from "@/lib/persistence/keys";
import {
  isPersistenceAvailable,
  persistGet,
  persistSet,
} from "@/lib/persistence/kv-store";
import { ONBOARDING_METADATA_KEY, parseOnboardingFromMetadata } from "@/lib/onboarding-metadata";
import {
  DEFAULT_TOPIC_PREFERENCES,
  normalizeTopicPreferences,
} from "@/lib/personalization/topic-preferences";
import {
  emptyReadingSignals,
  parseReadingSignalsFromMetadata,
  READING_SIGNALS_METADATA_KEY,
} from "@/lib/personalization/reading-signals-metadata";
import {
  parseSavedStoriesFromMetadata,
  SAVED_STORIES_METADATA_KEY,
  type SavedStoryRef,
} from "@/lib/saved-stories/metadata";
import type {
  UserIntelligencePatch,
  UserIntelligenceRecord,
} from "@/lib/user-profile/types";
import type { TopicPreferences } from "@/lib/personalization/topic-preferences";

export type UserProfileSaveResult =
  | { ok: true; record: UserIntelligenceRecord }
  | { ok: false; error: string; category: "storage" | "migration" | "unknown" };

function logUserProfile(event: string, payload: Record<string, unknown>): void {
  console.log(`[USER_PROFILE] ${event}`, JSON.stringify(payload));
}

function logUserProfileError(
  event: string,
  payload: Record<string, unknown>
): void {
  console.error(`[USER_PROFILE] ${event}`, JSON.stringify(payload));
}

export function emptyUserIntelligenceRecord(
  userId: string
): UserIntelligenceRecord {
  return {
    version: 1,
    userId,
    topicPreferences: { ...DEFAULT_TOPIC_PREFERENCES },
    savedStories: { items: [], updatedAt: 0 },
    readingSignals: emptyReadingSignals(),
    updatedAt: Date.now(),
  };
}

function normalizeRecord(
  userId: string,
  raw: Partial<UserIntelligenceRecord> | null | undefined
): UserIntelligenceRecord {
  const base = emptyUserIntelligenceRecord(userId);
  if (!raw) return base;

  return {
    version: 1,
    userId,
    topicPreferences: normalizeTopicPreferences(
      raw.topicPreferences ?? base.topicPreferences
    ),
    savedStories: parseSavedStoriesFromMetadata({
      [SAVED_STORIES_METADATA_KEY]: raw.savedStories,
    }),
    readingSignals: parseReadingSignalsFromMetadata({
      [READING_SIGNALS_METADATA_KEY]: raw.readingSignals,
    }),
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
    migratedFromClerkAt: raw.migratedFromClerkAt,
  };
}

async function readRawUserProfile(
  userId: string
): Promise<UserIntelligenceRecord | null> {
  const raw = await persistGet<UserIntelligenceRecord>(userProfileKey(userId));
  if (!raw?.userId) return null;
  return normalizeRecord(userId, raw);
}

async function writeRawUserProfile(
  record: UserIntelligenceRecord
): Promise<UserProfileSaveResult> {
  if (!isPersistenceAvailable()) {
    return {
      ok: false,
      error:
        "Profile storage is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
      category: "storage",
    };
  }

  const payload: UserIntelligenceRecord = {
    ...record,
    userId: record.userId,
    updatedAt: Date.now(),
  };

  const result = await persistSet(userProfileKey(record.userId), payload);
  if (!result.ok) {
    logUserProfileError("write_failed", {
      userId: record.userId,
      backend: result.backend,
      error: result.error,
    });
    return {
      ok: false,
      error: result.error ?? "Could not save user profile",
      category: "storage",
    };
  }

  logUserProfile("write_ok", {
    userId: record.userId,
    backend: result.backend,
    savedCount: payload.savedStories.items.length,
    openCount: payload.readingSignals.opens.length,
    neverCount: payload.topicPreferences.neverShow.length,
  });

  return { ok: true, record: payload };
}

/** Remove behavioral blobs from Clerk after KV migration. Best-effort. */
async function slimClerkMetadataAfterMigration(
  userId: string,
  publicMetadata: Record<string, unknown>
): Promise<void> {
  try {
    const onboarding = parseOnboardingFromMetadata(publicMetadata);
    const next: Record<string, unknown> = { ...publicMetadata };

    delete next[SAVED_STORIES_METADATA_KEY];
    delete next[READING_SIGNALS_METADATA_KEY];

    if (onboarding) {
      const { topicPreferences: _topics, ...clerkOnboarding } = onboarding;
      next[ONBOARDING_METADATA_KEY] = {
        interests: clerkOnboarding.interests,
        career: clerkOnboarding.career,
        focusType: clerkOnboarding.focusType,
        tone: clerkOnboarding.tone,
        completed: clerkOnboarding.completed,
        updatedAt: Date.now(),
      };
    }

    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, { publicMetadata: next });
    logUserProfile("clerk_slimmed", { userId });
  } catch (err) {
    const classified = classifyPersistenceError(err, "clerk_slim");
    logUserProfileError("clerk_slim_failed", {
      userId,
      detail: classified.detail,
    });
  }
}

async function migrateFromClerk(userId: string): Promise<{
  record: UserIntelligenceRecord;
  writeOk: boolean;
  error?: string;
}> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const publicMetadata = (user.publicMetadata ?? {}) as Record<
      string,
      unknown
    >;

    const onboarding = parseOnboardingFromMetadata(publicMetadata);
    const record = normalizeRecord(userId, {
      userId,
      topicPreferences: onboarding?.topicPreferences ?? DEFAULT_TOPIC_PREFERENCES,
      savedStories: parseSavedStoriesFromMetadata(publicMetadata),
      readingSignals: parseReadingSignalsFromMetadata(publicMetadata),
      migratedFromClerkAt: Date.now(),
    });

    logUserProfile("migrate_from_clerk", {
      userId,
      savedCount: record.savedStories.items.length,
      openCount: record.readingSignals.opens.length,
      neverCount: record.topicPreferences.neverShow.length,
    });

    const saved = await writeRawUserProfile(record);
    if (saved.ok) {
      await slimClerkMetadataAfterMigration(userId, publicMetadata);
      return { record, writeOk: true };
    }

    return { record, writeOk: false, error: saved.error };
  } catch (err) {
    const classified = classifyPersistenceError(err, "migrate_from_clerk");
    logUserProfileError("migrate_failed", {
      userId,
      detail: classified.detail,
    });
    return {
      record: emptyUserIntelligenceRecord(userId),
      writeOk: false,
      error: classified.message,
    };
  }
}

/** Load user profile from KV; migrate legacy Clerk blobs on first read. */
export async function loadUserProfile(
  userId: string
): Promise<UserIntelligenceRecord> {
  const existing = await readRawUserProfile(userId);
  if (existing) return existing;

  const migrated = await migrateFromClerk(userId);
  if (!migrated.writeOk) {
    logUserProfileError("load_migrate_write_failed", {
      userId,
      error: migrated.error,
    });
  }
  return migrated.record;
}

export async function patchUserProfile(
  userId: string,
  patch: UserIntelligencePatch
): Promise<UserProfileSaveResult> {
  const current = await loadUserProfile(userId);
  const next: UserIntelligenceRecord = {
    ...current,
    topicPreferences: patch.topicPreferences
      ? normalizeTopicPreferences(patch.topicPreferences)
      : current.topicPreferences,
    savedStories: patch.savedStories ?? current.savedStories,
    readingSignals: patch.readingSignals ?? current.readingSignals,
  };

  return writeRawUserProfile(next);
}

export async function getTopicPreferencesForUser(
  userId: string
): Promise<TopicPreferences> {
  const record = await loadUserProfile(userId);
  return record.topicPreferences;
}

export async function getSavedStoryRefsForUser(
  userId: string
): Promise<SavedStoryRef[]> {
  const record = await loadUserProfile(userId);
  return [...record.savedStories.items].sort((a, b) => b.savedAt - a.savedAt);
}

export async function getReadingSignalsForUser(userId: string) {
  const record = await loadUserProfile(userId);
  return record.readingSignals;
}

export async function loadUserIntelligenceInputs(userId: string): Promise<{
  topicPreferences: TopicPreferences;
  savedRefs: SavedStoryRef[];
  reading: ReturnType<typeof emptyReadingSignals>;
}> {
  const record = await loadUserProfile(userId);
  return {
    topicPreferences: record.topicPreferences,
    savedRefs: [...record.savedStories.items].sort(
      (a, b) => b.savedAt - a.savedAt
    ),
    reading: record.readingSignals,
  };
}
