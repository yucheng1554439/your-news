import "server-only";

import { getProfileBriefingFingerprint } from "@/lib/briefing/profile-fingerprint";
import type { BriefingCadence, BriefingMode } from "@/lib/briefing/types";
import { PERSIST_KEYS, userIntelligenceSnapshotKey } from "@/lib/persistence/keys";
import { readPlatformIntelligenceSnapshot } from "@/lib/persistence/intelligence-snapshot-persist";
import {
  readUserIntelligenceSnapshot,
} from "@/lib/persistence/user-intelligence-snapshot-persist";
import type { OnboardingProfile } from "@/lib/types";

export type BriefingSnapshotScope = "user-scoped" | "global-legacy" | "sync-fallback";

export type DashboardIsolationDebug = {
  userId: string | null;
  profileFingerprint: string;
  snapshotScope: {
    forYouDaily: BriefingSnapshotScope;
    forYouWeekly: BriefingSnapshotScope;
    globalDaily: "global";
    globalWeekly: "global";
  };
  briefingSourceKey: {
    forYouDaily: string | null;
    forYouWeekly: string | null;
    globalDaily: string;
    globalWeekly: string;
  };
};

function scopeForForYouBriefing(
  userId: string | undefined,
  profileFingerprint: string,
  cadence: BriefingCadence,
  mode: BriefingMode,
  hasUserBriefing: boolean,
  platformFingerprint: string | undefined,
  hasLegacyForYou: boolean
): BriefingSnapshotScope {
  if (mode !== "for-you") return "sync-fallback";
  if (!userId) return "sync-fallback";
  if (hasUserBriefing) return "user-scoped";
  if (hasLegacyForYou && platformFingerprint === profileFingerprint) {
    return "global-legacy";
  }
  return "sync-fallback";
}

/** Temporary isolation debug — enable via ?debugIsolation=1 on dashboard API. */
export async function resolveDashboardIsolationDebug(
  userId: string | undefined,
  profile: OnboardingProfile | null
): Promise<DashboardIsolationDebug> {
  const profileFingerprint = getProfileBriefingFingerprint(profile);
  const globalKey = PERSIST_KEYS.intelligenceSnapshot;
  const userKey = userId ? userIntelligenceSnapshotKey(userId) : null;

  const [platform, userSnapshot] = await Promise.all([
    readPlatformIntelligenceSnapshot(),
    userId ? readUserIntelligenceSnapshot(userId) : Promise.resolve(null),
  ]);

  const forYouDaily = userSnapshot?.briefings.daily["for-you"];
  const forYouWeekly = userSnapshot?.briefings.weekly["for-you"];
  const legacyDaily = platform?.briefings.daily["for-you"];
  const legacyWeekly = platform?.briefings.weekly["for-you"];

  return {
    userId: userId ?? null,
    profileFingerprint,
    snapshotScope: {
      forYouDaily: scopeForForYouBriefing(
        userId,
        profileFingerprint,
        "daily",
        "for-you",
        Boolean(forYouDaily),
        platform?.profileFingerprint,
        Boolean(legacyDaily)
      ),
      forYouWeekly: scopeForForYouBriefing(
        userId,
        profileFingerprint,
        "weekly",
        "for-you",
        Boolean(forYouWeekly),
        platform?.profileFingerprint,
        Boolean(legacyWeekly)
      ),
      globalDaily: "global",
      globalWeekly: "global",
    },
    briefingSourceKey: {
      forYouDaily:
        forYouDaily && userKey
          ? userKey
          : legacyDaily &&
              platform?.profileFingerprint === profileFingerprint
            ? globalKey
            : null,
      forYouWeekly:
        forYouWeekly && userKey
          ? userKey
          : legacyWeekly &&
              platform?.profileFingerprint === profileFingerprint
            ? globalKey
            : null,
      globalDaily: globalKey,
      globalWeekly: globalKey,
    },
  };
}
