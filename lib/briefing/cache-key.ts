import { createHash } from "crypto";
import { getProfileBriefingFingerprint } from "@/lib/briefing/profile-fingerprint";
import { getModelCacheToken } from "@/lib/intelligence/provider/config";
import type { OnboardingProfile } from "@/lib/types";
import type { BriefingCadence, BriefingMode } from "@/lib/briefing/types";

export { getProfileBriefingFingerprint } from "@/lib/briefing/profile-fingerprint";

export function weeklyBriefingCacheKey(
  mode: BriefingMode,
  profile: OnboardingProfile | null,
  narrativeClusterId: string,
  cadence: BriefingCadence = "weekly"
): string {
  const clusterHash = createHash("sha256")
    .update(narrativeClusterId)
    .digest("hex")
    .slice(0, 16);

  const profileFingerprint = getProfileBriefingFingerprint(profile);
  const modelToken = getModelCacheToken();

  return `brief-v17:${cadence}:${modelToken}:${profileFingerprint}:${clusterHash}`;
}
