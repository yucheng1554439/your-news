import "server-only";

import {
  buildClusterIntelligence,
  clusterStoriesForBriefing,
  MAX_CLUSTER_BRIEFING_STORIES,
} from "@/lib/editorial/cluster-intelligence";
import {
  buildNarrativeClusters,
  type NarrativeCluster,
} from "@/lib/editorial/narrative-clusters";
import type { BriefingMode } from "@/lib/briefing/types";
import type {
  NarrativeThread,
  WeeklyBriefingSelection,
} from "@/lib/briefing/weekly-selection";
import type { Story } from "@/lib/types";

function resolveClusterForThread(
  thread: NarrativeThread,
  clusters: NarrativeCluster[]
): NarrativeCluster | undefined {
  const leadSlug = thread.stories[0]?.slug;

  if (leadSlug) {
    const byLead = clusters.find((c) =>
      c.stories.some((s) => s.slug === leadSlug)
    );
    if (byLead) return byLead;
  }

  const direct = clusters.find((c) => c.id === thread.clusterId);
  if (direct) return direct;

  if (thread.clusterId.startsWith("event:")) {
    const slug = thread.clusterId.replace(/^event:/, "");
    return clusters.find((c) => c.stories.some((s) => s.slug === slug));
  }

  if (thread.clusterId.startsWith("global:")) {
    const inner = thread.clusterId.replace(/^global:/, "");
    return clusters.find((c) => c.id === inner);
  }

  const lead = thread.stories[0];
  if (lead?.narrativeClusterId) {
    return clusters.find((c) => c.id === lead.narrativeClusterId);
  }

  return clusters.find(
    (c) =>
      c.theme === thread.theme &&
      thread.stories.some((s) => c.stories.some((cs) => cs.slug === s.slug))
  );
}

function storiesForThread(cluster: NarrativeCluster): Story[] {
  return clusterStoriesForBriefing(cluster, MAX_CLUSTER_BRIEFING_STORIES);
}

function enrichThread(
  thread: NarrativeThread,
  clusters: NarrativeCluster[],
  _mode: BriefingMode,
  _cadence: WeeklyBriefingSelection["cadence"]
): NarrativeThread {
  const cluster = resolveClusterForThread(thread, clusters);
  if (!cluster) return thread;

  const stories = storiesForThread(cluster);
  if (stories.length === 0 && thread.stories.length > 0) {
    return thread;
  }

  const intelligence = buildClusterIntelligence(cluster);

  return {
    ...thread,
    label: intelligence.title,
    cluster: intelligence,
    stories: stories.length > 0 ? stories : thread.stories,
  };
}

export type EnrichBriefingOptions = {
  /** Full editorial pool — clusters are built from this (largest available set). */
  corpus: Story[];
};

/**
 * Attach cluster objects for synthesis.
 * All cadences and modes → full cluster coverage from corpus.
 */
export function enrichBriefingSelection(
  selection: WeeklyBriefingSelection,
  options: EnrichBriefingOptions
): WeeklyBriefingSelection {
  const clusters = buildNarrativeClusters(options.corpus);
  return {
    ...selection,
    threads: selection.threads.map((t) =>
      enrichThread(t, clusters, selection.mode, selection.cadence)
    ),
  };
}
