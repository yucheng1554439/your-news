import "server-only";

import {
  detectNarrativeTheme,
  type NarrativeTheme,
} from "@/lib/editorial/narrative-clusters";
import { THEME_LABELS } from "@/lib/briefing/narrative-synthesis";
import {
  briefingCorpusForCadence,
  expandSelectionToCorpusMinimum,
} from "@/lib/briefing/briefing-corpus";
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
import type {
  WeeklyBriefingSelection,
  NarrativeThread,
} from "@/lib/briefing/weekly-selection";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import type { BriefingCadence, BriefingMode } from "@/lib/briefing/types";
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

  let removedBySlug = 0;

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
  return `landscape:${ids.slice(0, 120)}`;
}

function selectGlobalLandscapeFromMap(
  pool: Story[],
  profile: OnboardingProfile | null,
  cadence: BriefingCadence,
  intelligence?: UserIntelligenceProfile | null
): WeeklyBriefingSelection {
  const map = buildWeeklyIntelligenceMap(pool, profile, "global", intelligence);

  console.log(
    `[BRIEFING_CORPUS] ${cadence}/global landscape`,
    formatWeeklyLandscapeSummary(map)
  );

  if (map.entries.length === 0) {
    const byTheme = new Map<NarrativeTheme, Story[]>();
    for (const story of pool) {
      const theme = (story.narrativeTheme ??
        detectNarrativeTheme(story)) as NarrativeTheme;
      const list = byTheme.get(theme) ?? [];
      list.push(story);
      byTheme.set(theme, list);
    }
    const themeGroups =
      byTheme.size >= 2
        ? [...byTheme.entries()]
        : ([["general", pool]] as [NarrativeTheme, Story[]][]);

    return {
      cadence,
      mode: "global",
      lens: "pattern",
      cacheKeyId: `${cadence}:landscape:fallback`,
      threads: themeGroups.map(([theme, stories], idx) => ({
        clusterId: `global:fallback:${theme}:${idx}`,
        theme,
        label: THEME_LABELS[theme],
        personalScore: 0,
        stories,
      })),
    };
  }

  const threads: NarrativeThread[] = map.entries.map((entry) => {
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
    cadence,
    mode: "global",
    lens: "pattern",
    cacheKeyId: `${cadence}:${buildCacheKeyId(threads)}`,
    threads,
  };
}

/**
 * Daily or weekly LANDSCAPE briefing — full cadence corpus, all clusters.
 * For You uses the same source pool as Global; personalization is ranking only.
 */
export function selectWeeklyPatternBriefing(
  corpus: Story[],
  mode: BriefingMode,
  profile: OnboardingProfile | null,
  cadence: BriefingCadence = "weekly",
  exclusion?: DailyExclusion,
  intelligence?: UserIntelligenceProfile | null
): WeeklyBriefingSelection {
  const cadencePool = briefingCorpusForCadence(corpus, cadence);
  const { pool } = filterExcludedWithStats(cadencePool, exclusion, mode);

  let selection: WeeklyBriefingSelection;

  if (mode === "global") {
    selection = selectGlobalLandscapeFromMap(
      pool,
      profile,
      cadence,
      intelligence
    );
  } else {
    const personalized = selectPersonalizedWeeklyThreads(
      pool,
      profile,
      cadence,
      intelligence
    );
    selection = {
      ...personalized,
      lens: "pattern",
      cacheKeyId: personalized.cacheKeyId.replace(/^weekly:/, `${cadence}:`),
    };
  }

  return expandSelectionToCorpusMinimum(selection, pool, mode, profile);
}

/** @deprecated Use selectWeeklyPatternBriefing — daily now uses full landscape too. */
export function selectDailyEventBriefing(
  stories: Story[],
  mode: BriefingMode,
  profile: OnboardingProfile | null,
  intelligence?: UserIntelligenceProfile | null
): WeeklyBriefingSelection {
  return selectWeeklyPatternBriefing(
    stories,
    mode,
    profile,
    "daily",
    undefined,
    intelligence
  );
}
