import "server-only";

import type { WeeklyBriefingSelection } from "@/lib/briefing/weekly-selection";
import { allStoriesFromSelection } from "@/lib/briefing/weekly-selection";
import type { BriefingProvenance } from "@/lib/briefing/types";
import { countSignalsInStories } from "@/lib/briefing/briefing-corpus";
import { getStorySourceTier } from "@/lib/editorial/source-authority";
import type { Story } from "@/lib/types";

function normalizeSourceName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function buildProvenanceFromStories(stories: Story[]): BriefingProvenance {
  const tierOrder = (name: string, storyList: Story[]) => {
    const tier = storyList.find((s) => s.source === name);
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

  const storiesProcessed = stories.length;
  const sourcesProcessed = sources.length;

  return {
    articleCount: storiesProcessed,
    narrativeCount: 0,
    sourceCount: sourcesProcessed,
    sources: sources.slice(0, 12),
    storiesProcessed,
    sourcesProcessed,
    narrativesProcessed: 0,
    signalsProcessed: countSignalsInStories(stories),
  };
}

export function buildProvenanceFromSelection(
  selection: WeeklyBriefingSelection
): BriefingProvenance {
  const synthesisStories = allStoriesFromSelection(selection);
  const narrativeCount = selection.threads.length;
  const threadsWithCluster = selection.threads.filter((t) => t.cluster);

  if (threadsWithCluster.length > 0) {
    const storiesProcessed = synthesisStories.length;
    const sourceNames = [
      ...new Set(
        synthesisStories.map((s) => normalizeSourceName(s.source || "Unknown"))
      ),
    ];
    const sourcesProcessed = sourceNames.length;

    return {
      articleCount: storiesProcessed,
      narrativeCount,
      sourceCount: sourcesProcessed,
      sources: sourceNames.slice(0, 12),
      storiesProcessed,
      sourcesProcessed,
      narrativesProcessed: narrativeCount,
      signalsProcessed: countSignalsInStories(synthesisStories),
    };
  }

  const fromStories = buildProvenanceFromStories(synthesisStories);
  return {
    ...fromStories,
    narrativeCount,
    narrativesProcessed: narrativeCount,
  };
}
