import "server-only";

import type { SavedStoryRef } from "@/lib/saved-stories/metadata";
import type { OnboardingProfile, Story } from "@/lib/types";

function countTags(stories: Story[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const story of stories) {
    for (const tag of story.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Living reader model from saved stories + recent pool (extensible to opens/skips).
 */
export function buildBehavioralModelNote(
  profile: OnboardingProfile,
  savedRefs: SavedStoryRef[],
  recentPool: Story[]
): string {
  const savedSlugs = new Set(savedRefs.map((r) => r.slug));
  const savedStories = recentPool.filter((s) => savedSlugs.has(s.slug));
  const savedTags = countTags(savedStories);

  const topSaved = [...savedTags.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  const poolTags = countTags(recentPool);
  const topPool = [...poolTags.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  const lines: string[] = [
    "BEHAVIORAL MODEL (weight heavily for For You — this is how the reader actually spends attention):",
  ];

  if (savedRefs.length > 0) {
    lines.push(
      `- Saved ${savedRefs.length} stories — strongest signal. Top saved themes: ${topSaved.join(", ") || "mixed"}.`
    );
  } else {
    lines.push("- No saved stories yet — lean on career + interests + focus.");
  }

  if (topPool.length > 0) {
    lines.push(`- Recent feed emphasis: ${topPool.join(", ")}.`);
  }

  const ignored = profile.interests.filter(
    (i) => !topSaved.some((t) => t.includes(i)) && !topPool.some((t) => t.includes(i))
  );
  if (ignored.length > 0 && savedRefs.length >= 2) {
    lines.push(
      `- Deprioritize unless breaking: ${ignored.join(", ")} (weak behavioral signal).`
    );
  }

  lines.push(
    `- Write for this specific reader — not a generic ${profile.career ?? "professional"} template.`
  );

  return lines.join("\n");
}
