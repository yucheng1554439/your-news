import type { BriefingMode } from "@/lib/briefing/types";

/** User-facing intelligence mode label — never mentions cadence. */
export function intelligenceModeLabel(mode: BriefingMode): string {
  return mode === "for-you" ? "For You Intelligence" : "Global Intelligence";
}

/** Date stamp for the current intelligence brief. */
export function intelligencePeriodLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
