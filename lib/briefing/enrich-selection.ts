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

const FOR_YOU_DAILY_MAX = 8;

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

function storiesForThread(
  cluster: NarrativeCluster,
  thread: NarrativeThread,
  mode: BriefingMode,
  cadence: WeeklyBriefingSelection["cadence"]
): Story[] {
  if (cadence === "weekly") {
    return clusterStoriesForBriefing(cluster, MAX_CLUSTER_BRIEFING_STORIES);
  }

  if (mode === "global") {
    return clusterStoriesForBriefing(cluster, MAX_CLUSTER_BRIEFING_STORIES);
  }

  const cap = FOR_YOU_DAILY_MAX;

  const leadSlug = thread.stories[0]?.slug;
  const ordered = [...cluster.stories].sort((a, b) => {
    if (a.slug === leadSlug) return -1;
    if (b.slug === leadSlug) return 1;
    return (b.importanceScore ?? 0) - (a.importanceScore ?? 0);
  });

  return ordered.slice(0, cap);
}

function enrichThread(
  thread: NarrativeThread,
  clusters: NarrativeCluster[],
  mode: BriefingMode,
  cadence: WeeklyBriefingSelection["cadence"]
): NarrativeThread {
  const cluster = resolveClusterForThread(thread, clusters);
  if (!cluster) return thread;

  const stories = storiesForThread(cluster, thread, mode, cadence);
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
 * Weekly (global + for-you) → full cluster coverage from corpus.
 * Daily for-you → filtered subset for the reader.
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
