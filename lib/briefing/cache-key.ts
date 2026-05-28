import { createHash } from "crypto";
import { getProfileBriefingFingerprint } from "@/lib/briefing/profile-fingerprint";
import type { OnboardingProfile } from "@/lib/types";
import type { WeeklyBriefingMode } from "@/lib/briefing/weekly-engine";

export { getProfileBriefingFingerprint } from "@/lib/briefing/profile-fingerprint";

export function weeklyBriefingCacheKey(
  mode: WeeklyBriefingMode,
  profile: OnboardingProfile | null,
  storySlugs: string[]
): string {
  const slugHash = createHash("sha256")
    .update(storySlugs.slice(0, 8).join(","))
    .digest("hex")
    .slice(0, 16);

  const profileFingerprint = getProfileBriefingFingerprint(profile);

  return `advisor-v10:${mode}:${profileFingerprint}:${slugHash}`;
}
