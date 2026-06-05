import "server-only";

import type {
  BriefingBundle,
  IntelligenceBriefing,
} from "@/lib/briefing/types";
import { normalizeBriefing } from "@/lib/briefing/shared/normalize";
import { userIntelligenceSnapshotKey } from "@/lib/persistence/keys";
import { persistGet, persistSet } from "@/lib/persistence/kv-store";

/** Per-user personalized intelligence — never shared across users. */
export type UserIntelligenceSnapshot = {
  version: 1;
  userId: string;
  profileFingerprint: string;
  updatedAt: number;
  briefings: {
    daily: Pick<BriefingBundle, "for-you">;
    /** Legacy — no longer written on refresh. */
    weekly: Pick<BriefingBundle, "for-you">;
  };
};

function normalizeUserSnapshot(
  snapshot: UserIntelligenceSnapshot
): UserIntelligenceSnapshot {
  const daily = snapshot.briefings.daily["for-you"];
  return {
    ...snapshot,
    briefings: {
      daily: daily
        ? { "for-you": normalizeBriefing(daily, "daily") }
        : {},
      weekly: {},
    },
  };
}

export async function readUserIntelligenceSnapshot(
  userId: string
): Promise<UserIntelligenceSnapshot | null> {
  const raw = await persistGet<UserIntelligenceSnapshot>(
    userIntelligenceSnapshotKey(userId)
  );
  if (!raw || raw.version !== 1 || raw.userId !== userId) return null;
  return normalizeUserSnapshot(raw);
}

export async function writeUserIntelligenceSnapshot(
  snapshot: UserIntelligenceSnapshot
): Promise<boolean> {
  const payload = normalizeUserSnapshot(snapshot);
  const result = await persistSet(
    userIntelligenceSnapshotKey(snapshot.userId),
    payload
  );

  if (!result.ok) {
    console.error(
      `[PERSIST] User intelligence snapshot write FAILED (${snapshot.userId}): ${result.error ?? "unknown"}`
    );
    return false;
  }

  console.log(
    `[SNAPSHOT_SCOPE] user-scoped userId=${snapshot.userId} key=${userIntelligenceSnapshotKey(snapshot.userId)}`
  );
  return true;
}

export function buildUserIntelligenceSnapshot(input: {
  userId: string;
  profileFingerprint: string;
  updatedAt: number;
  forYou: IntelligenceBriefing;
}): UserIntelligenceSnapshot {
  return {
    version: 1,
    userId: input.userId,
    profileFingerprint: input.profileFingerprint,
    updatedAt: input.updatedAt,
    briefings: {
      daily: { "for-you": input.forYou },
      weekly: {},
    },
  };
}
