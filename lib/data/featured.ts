import { compareByEditorialImportance } from "@/lib/importance-scoring";
import type { Story } from "@/lib/types";

export function getFeaturedStory(stories: Story[]): Story | undefined {
  if (stories.length === 0) return undefined;

  const critical = stories.find(
    (s) => s.importanceLabel === "Critical" || s.importance === "critical"
  );
  if (critical) return critical;

  const sorted = [...stories].sort(compareByEditorialImportance);
  return sorted[0];
}
