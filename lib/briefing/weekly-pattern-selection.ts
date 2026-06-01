import {
  detectNarrativeTheme,
  type NarrativeTheme,
} from "@/lib/editorial/narrative-clusters";
import { THEME_LABELS } from "@/lib/briefing/narrative-synthesis";
import { selectPersonalizedWeeklyThreads } from "@/lib/briefing/personalized-weekly";
import {
  buildWeeklyIntelligenceMap,
  formatWeeklyLandscapeSummary,
} from "@/lib/briefing/weekly-intelligence-map";
import {
  logWeeklyFilter,
  logWeeklyCluster,
  type WeeklyFilterStats,
} from "@/lib/briefing/weekly-pipeline-log";
import type { WeeklyBriefingSelection, NarrativeThread } from "@/lib/briefing/weekly-selection";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import type { BriefingMode } from "@/lib/briefing/types";
import type { OnboardingProfile, Story } from "@/lib/types";

export type DailyExclusion = {
  themes: NarrativeTheme[];
  slugs: string[];
};

export type ExclusionFilterResult = {
  pool: Story[];
  stats: WeeklyFilterStats;
};

export function filterExcludedWithStats(
  stories: Story[],
  exclusion: DailyExclusion | undefined,
  mode: BriefingMode
): ExclusionFilterResult {
  const inputCount = stories.length;

  if (!exclusion || (exclusion.slugs.length === 0 && exclusion.themes.length === 0)) {
    const stats: WeeklyFilterStats = {
      mode,
      inputCount,
      afterExclusion: inputCount,
      removedBySlug: 0,
      removedByTheme: 0,
      exclusionRelaxed: false,
      exclusionBypassed: false,
    };
    logWeeklyFilter(stats);
    return { pool: stories, stats };
  }

  const slugSet = new Set(exclusion.slugs);
  const themeSet = new Set<NarrativeTheme>(exclusion.themes);

  let removedBySlug = 0;
  let removedByTheme = 0;

  /** Weekly: exclude daily slugs only — keep full thematic landscape for synthesis. */
  const slugOnly = stories.filter((s) => {
    if (slugSet.has(s.slug)) {
      removedBySlug += 1;
      return false;
    }
    return true;
  });

  if (slugOnly.length > 0) {
    const stats: WeeklyFilterStats = {
      mode,
      inputCount,
      afterExclusion: slugOnly.length,
      removedBySlug,
      removedByTheme: 0,
      exclusionRelaxed: true,
      exclusionBypassed: false,
    };
    logWeeklyFilter(stats);
    return { pool: slugOnly, stats };
  }

  console.warn(
    `[WEEKLY_FILTER] ${mode} slug exclusion emptied pool — bypassing exclusion`
  );
  const stats: WeeklyFilterStats = {
    mode,
    inputCount,
    afterExclusion: inputCount,
    removedBySlug: 0,
    removedByTheme: 0,
    exclusionRelaxed: false,
    exclusionBypassed: true,
  };
  logWeeklyFilter(stats);
  return { pool: stories, stats };
}

function buildCacheKeyId(threads: NarrativeThread[]): string {
  const ids = threads
    .map((t) => t.clusterId)
    .sort()
    .join("+");
  return `global:${ids.slice(0, 120)}`;
}

function selectGlobalWeeklyFromMap(
  pool: Story[],
  profile: OnboardingProfile | null,
  intelligence?: UserIntelligenceProfile | null
): WeeklyBriefingSelection {
  const map = buildWeeklyIntelligenceMap(pool, profile, "global", intelligence);

  console.log(
    "[WEEKLY_SELECTION] global landscape",
    formatWeeklyLandscapeSummary(map)
  );

  if (map.entries.length === 0) {
    const theme = pool[0]
      ? detectNarrativeTheme(pool[0])
      : ("general" as NarrativeTheme);
    return {
      cadence: "weekly",
      mode: "global",
      lens: "pattern",
      cacheKeyId: "pattern:global:fallback",
      threads: [
        {
          clusterId: "global:fallback",
          theme,
          label: THEME_LABELS[theme],
          personalScore: 0,
          stories: pool.slice(0, 40),
        },
      ],
    };
  }

  const threads: NarrativeThread[] = map.entries.slice(0, 6).map((entry) => {
    logWeeklyCluster({
      mode: "global",
      clusterId: entry.cluster.id,
      theme: entry.cluster.theme,
      label: entry.intelligence.title,
      storyCount: entry.stories.length,
      source: "global",
    });
    return {
      clusterId: entry.cluster.id,
      theme: entry.cluster.theme,
      label: entry.intelligence.title,
      personalScore: 0,
      cluster: entry.intelligence,
      stories: entry.stories,
    };
  });

  return {
    cadence: "weekly",
    mode: "global",
    lens: "pattern",
    cacheKeyId: `pattern:${buildCacheKeyId(threads)}`,
    threads,
  };
}

/**
 * Weekly = PATTERN briefing. Full corpus → clusters → synthesis (global or personalized).
 */
export function selectWeeklyPatternBriefing(
  corpus: Story[],
  mode: BriefingMode,
  profile: OnboardingProfile | null,
  exclusion?: DailyExclusion,
  intelligence?: UserIntelligenceProfile | null
): WeeklyBriefingSelection {
  const { pool } = filterExcludedWithStats(corpus, exclusion, mode);

  if (mode === "global") {
    return selectGlobalWeeklyFromMap(pool, profile, intelligence);
  }

  const personalized = selectPersonalizedWeeklyThreads(
    pool,
    profile,
    "weekly",
    intelligence
  );
  return {
    ...personalized,
    lens: "pattern",
    cacheKeyId: personalized.cacheKeyId.replace(/^weekly:/, "pattern:"),
  };
}
