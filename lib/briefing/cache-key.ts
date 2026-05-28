import { createHash } from "crypto";
import { getProfileBriefingFingerprint } from "@/lib/briefing/profile-fingerprint";
import { getModelCacheToken } from "@/lib/intelligence/provider/config";
import type { OnboardingProfile } from "@/lib/types";
import type { WeeklyBriefingMode } from "@/lib/briefing/weekly-engine";

export { getProfileBriefingFingerprint } from "@/lib/briefing/profile-fingerprint";

export function weeklyBriefingCacheKey(
  mode: WeeklyBriefingMode,
  profile: OnboardingProfile | null,
  narrativeClusterId: string
): string {
  const clusterHash = createHash("sha256")
    .update(narrativeClusterId)
    .digest("hex")
    .slice(0, 16);

  const profileFingerprint = getProfileBriefingFingerprint(profile);
  const modelToken = getModelCacheToken();

  return `cluster-v12-grounded:${modelToken}:${mode}:${profileFingerprint}:${clusterHash}`;
}
