import type { IntelligenceBriefing } from "@/lib/briefing/types";

/** Scannable memo layout for the hero (not a wall of text). */
export function formatBriefingForDisplay(briefing: IntelligenceBriefing): string {
  const blocks: string[] = [];

  if (briefing.whatChanged?.trim()) {
    blocks.push(`What Changed\n${briefing.whatChanged.trim()}`);
  }

  const why =
    briefing.whyYou?.trim() ||
    (briefing.mode === "for-you" ? undefined : briefing.whyItMatters?.trim());
  if (why) {
    blocks.push(
      `${briefing.mode === "for-you" ? "Why It Matters To You" : "Why It Matters"}\n${why}`
    );
  }

  if (briefing.watchItems && briefing.watchItems.length > 0) {
    const bullets = briefing.watchItems.map((w) => `• ${w.trim()}`).join("\n");
    blocks.push(`What To Watch\n${bullets}`);
  } else if (briefing.keySignal?.trim()) {
    blocks.push(`What To Watch\n• ${briefing.keySignal.trim()}`);
  }

  const action =
    briefing.positioning?.trim() ||
    briefing.decisions?.trim();
  if (action) {
    blocks.push(`Action / Positioning\n${action}`);
  }

  if (briefing.invalidateIf?.trim() && briefing.mode === "for-you") {
    blocks.push(`Would Change If\n${briefing.invalidateIf.trim()}`);
  }

  if (blocks.length > 0) return blocks.join("\n\n");

  return briefing.summary?.trim() ?? "";
}
