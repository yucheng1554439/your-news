import type { WeeklyBriefingSelection } from "@/lib/briefing/weekly-selection";
import type { BriefingProvenance } from "@/lib/briefing/types";
import { getStorySourceTier } from "@/lib/editorial/source-authority";
import type { Story } from "@/lib/types";

function normalizeSourceName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function buildProvenanceFromStories(stories: Story[]): BriefingProvenance {
  const tierOrder = (name: string, stories: Story[]) => {
    const tier = stories.find((s) => s.source === name);
    return tier ? getStorySourceTier(tier) : 3;
  };

  const bySource = new Map<string, Story[]>();
  for (const story of stories) {
    const name = normalizeSourceName(story.source || "Unknown");
    const list = bySource.get(name) ?? [];
    list.push(story);
    bySource.set(name, list);
  }

  const sources = [...bySource.keys()].sort((a, b) => {
    const ta = tierOrder(a, bySource.get(a)!);
    const tb = tierOrder(b, bySource.get(b)!);
    if (ta !== tb) return ta - tb;
    return a.localeCompare(b);
  });

  return {
    articleCount: stories.length,
    narrativeCount: 0,
    sourceCount: sources.length,
    sources: sources.slice(0, 12),
  };
}

export function buildProvenanceFromSelection(
  selection: WeeklyBriefingSelection
): BriefingProvenance {
  const narrativeCount = selection.threads.length;
  const threadsWithCluster = selection.threads.filter((t) => t.cluster);

  if (threadsWithCluster.length > 0) {
    const sources = new Set<string>();
    let articleCount = 0;
    for (const thread of threadsWithCluster) {
      const cluster = thread.cluster!;
      articleCount += cluster.articleCount;
      for (const source of cluster.sources) {
        sources.add(source.name);
      }
    }
    return {
      articleCount,
      narrativeCount,
      sourceCount: sources.size,
      sources: [...sources].slice(0, 12),
    };
  }

  const stories = selection.threads.flatMap((t) => t.stories);
  return {
    ...buildProvenanceFromStories(stories),
    narrativeCount,
  };
}
