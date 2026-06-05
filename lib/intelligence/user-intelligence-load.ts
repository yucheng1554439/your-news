import "server-only";

import type { BriefingCadence, BriefingMode, IntelligenceBriefing } from "@/lib/briefing/types";
import { readPlatformIntelligenceSnapshot } from "@/lib/persistence/intelligence-snapshot-persist";
import {
  readUserIntelligenceSnapshot,
  type UserIntelligenceSnapshot,
} from "@/lib/persistence/user-intelligence-snapshot-persist";

/**
 * One-time migration: legacy platform snapshot stored for-you briefings globally.
 * Only adopt if fingerprint matches the requesting user.
 */
export async function migrateLegacyForYouBriefings(
  userId: string,
  profileFingerprint: string
): Promise<UserIntelligenceSnapshot | null> {
  const existing = await readUserIntelligenceSnapshot(userId);
  if (existing) return existing;

  const platform = await readPlatformIntelligenceSnapshot();
  if (!platform || platform.profileFingerprint !== profileFingerprint) {
    return null;
  }

  const daily = platform.briefings.daily["for-you"];
  if (!daily) return null;

  return {
    version: 1,
    userId,
    profileFingerprint,
    updatedAt: platform.updatedAt,
    briefings: {
      daily: { "for-you": daily },
      weekly: {},
    },
  };
}

export async function loadUserIntelligenceSnapshot(
  userId: string | undefined,
  profileFingerprint: string
): Promise<UserIntelligenceSnapshot | null> {
  if (!userId) return null;

  const direct = await readUserIntelligenceSnapshot(userId);
  if (direct) return direct;

  return migrateLegacyForYouBriefings(userId, profileFingerprint);
}

export function readCachedBriefing(
  mode: BriefingMode,
  cadence: BriefingCadence,
  platformSnapshot: Awaited<ReturnType<typeof readPlatformIntelligenceSnapshot>>,
  userSnapshot: UserIntelligenceSnapshot | null
): IntelligenceBriefing | undefined {
  if (mode === "for-you") {
    return userSnapshot?.briefings[cadence]?.["for-you"];
  }
  return platformSnapshot?.briefings[cadence]?.global;
}
