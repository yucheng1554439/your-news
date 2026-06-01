import type { BriefingCadence, BriefingMode } from "@/lib/briefing/types";

function prefix(cadence: BriefingCadence): string {
  return cadence === "weekly" ? "[WEEKLY]" : "[DAILY]";
}

export function logBriefing(
  cadence: BriefingCadence,
  mode: BriefingMode,
  event: string,
  detail?: string
): void {
  const msg = detail
    ? `${prefix(cadence)} ${event} · ${mode} — ${detail}`
    : `${prefix(cadence)} ${event} · ${mode}`;
  console.log(msg);
}
