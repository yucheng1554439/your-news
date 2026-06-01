import type { BriefingMode } from "@/lib/briefing/types";
import type { NarrativeTheme } from "@/lib/editorial/narrative-clusters";
import type { WeeklyBriefingSelection } from "@/lib/briefing/weekly-selection";

export type WeeklyFilterStats = {
  mode: BriefingMode;
  inputCount: number;
  afterExclusion: number;
  removedBySlug: number;
  removedByTheme: number;
  exclusionRelaxed: boolean;
  exclusionBypassed: boolean;
};

export function logWeeklySelection(input: {
  mode: BriefingMode;
  cadence: "weekly" | "daily";
  candidateCount: number;
  poolAfterRank?: number;
  threadCount?: number;
  storyCount?: number;
  rescueApplied?: boolean;
}): void {
  console.log(
    "[WEEKLY_SELECTION]",
    JSON.stringify({
      mode: input.mode,
      cadence: input.cadence,
      candidateStories: input.candidateCount,
      poolAfterRank: input.poolAfterRank,
      threadCount: input.threadCount,
      selectedStoryCount: input.storyCount,
      rescueApplied: input.rescueApplied ?? false,
    })
  );
}

export function logWeeklyFilter(stats: WeeklyFilterStats): void {
  console.log(
    "[WEEKLY_FILTER]",
    JSON.stringify({
      mode: stats.mode,
      inputCount: stats.inputCount,
      afterExclusion: stats.afterExclusion,
      removedBySlug: stats.removedBySlug,
      removedByTheme: stats.removedByTheme,
      exclusionRelaxed: stats.exclusionRelaxed,
      exclusionBypassed: stats.exclusionBypassed,
    })
  );
}

export function logWeeklyCluster(input: {
  mode: BriefingMode;
  clusterId: string;
  theme: NarrativeTheme | string;
  label: string;
  storyCount: number;
  source: "pattern" | "global" | "personalized" | "fallback" | "rescue";
}): void {
  console.log(
    "[WEEKLY_CLUSTER]",
    JSON.stringify({
      mode: input.mode,
      clusterId: input.clusterId,
      theme: input.theme,
      label: input.label.slice(0, 96),
      storyCount: input.storyCount,
      source: input.source,
    })
  );
}

export function logWeeklySelectionFromResult(
  selection: WeeklyBriefingSelection,
  candidateCount: number,
  rescueApplied = false
): void {
  const storyCount = selection.threads.reduce(
    (n, t) => n + t.stories.length,
    0
  );
  logWeeklySelection({
    mode: selection.mode,
    cadence: selection.cadence === "daily" ? "daily" : "weekly",
    candidateCount,
    threadCount: selection.threads.length,
    storyCount,
    rescueApplied,
  });

  for (const thread of selection.threads) {
    logWeeklyCluster({
      mode: selection.mode,
      clusterId: thread.clusterId,
      theme: thread.theme,
      label: thread.label,
      storyCount: thread.stories.length,
      source: thread.clusterId.includes("rescue")
        ? "rescue"
        : thread.clusterId === "fallback"
          ? "fallback"
          : selection.mode === "global"
            ? "global"
            : "personalized",
    });
  }
}
