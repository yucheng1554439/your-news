import { getCategoryLabel } from "@/lib/data/categories";
import type { Story, StoryCategory } from "@/lib/types";

function dominantCategory(stories: Story[]): StoryCategory | null {
  const counts = new Map<StoryCategory, number>();
  for (const s of stories) {
    counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? null;
}

/** Editorial takeaway for the weekly hero — not filler. */
export function deriveKeySignal(stories: Story[]): string {
  if (stories.length === 0) return "";

  const critical = stories.find((s) => s.importanceLabel === "Critical");
  if (critical) {
    const label = getCategoryLabel(critical.category);
    return `Key signal · ${label}: ${critical.headline}`;
  }

  const lead = stories[0];
  const dominant = dominantCategory(stories);
  if (dominant && lead) {
    const theme = getCategoryLabel(dominant);
    const second = stories.find((s) => s.category !== dominant);
    if (second) {
      return `Dominant theme · ${theme} leads the week; ${getCategoryLabel(second.category).toLowerCase()} remains a secondary thread.`;
    }
    return `Dominant theme · ${theme}: ${lead.headline}`;
  }

  if (lead) {
    return `Lead development · ${lead.source}: ${lead.headline}`;
  }

  return "";
}
