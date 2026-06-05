import "server-only";

import type { PlatformDashboard } from "@/lib/intelligence/platform-snapshot";
import { briefingCorpusForCadence } from "@/lib/briefing/briefing-corpus";
import { logBriefingProvenance } from "@/lib/briefing/briefing-provenance-guard";
import { getFeaturedStory } from "@/lib/data/featured";
import { selectMoreStoriesForFeed } from "@/lib/feed/more-stories";
import {
  selectRelevantStoriesForUser,
  selectTopStoriesForUser,
} from "@/lib/personalization/relevance-gate";
import type { OnboardingProfile, Story } from "@/lib/types";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import type { BriefingBundle } from "@/lib/briefing/types";
import type { DashboardIsolationDebug } from "@/lib/api/dashboard-debug";

export type DashboardApiPayload = {
  ok: true;
  version: "v1";
  profile: OnboardingProfile | null;
  stories: Story[];
  globalStories: Story[];
  userIntelligence: UserIntelligenceProfile | null;
  briefings: BriefingBundle;
  sections: {
    leadSlug: string | null;
    relevantSlugs: string[];
    topSlugs: string[];
    moreStoriesSlugs: string[];
  };
  meta: {
    fetchedAt: number;
    intelligenceUpdatedAt: number | null;
    hasIntelligenceSnapshot: boolean;
    persistenceConfigured: boolean;
    cacheStatus: string;
    feedError: string | null;
    fromPersistentStore: boolean;
  };
  /** Temporary isolation debug — present when ?debugIsolation=1 */
  debug?: DashboardIsolationDebug;
};

export function serializeDashboardResponse(
  profile: OnboardingProfile | null,
  dashboard: PlatformDashboard,
  options?: { debug?: DashboardIsolationDebug }
): DashboardApiPayload {
  const lead = getFeaturedStory(
    dashboard.stories,
    profile,
    true,
    dashboard.userIntelligence
  );
  const relevant = profile?.completed
    ? selectRelevantStoriesForUser(
        dashboard.stories,
        profile,
        dashboard.userIntelligence,
        4
      )
    : [];
  const top = profile?.completed
    ? selectTopStoriesForUser(
        dashboard.stories,
        profile,
        dashboard.userIntelligence,
        6
      )
    : dashboard.stories.slice(0, 6);

  const excludeSlugs = new Set<string>([
    lead?.slug,
    ...relevant.map((s) => s.slug),
    ...top.map((s) => s.slug),
  ].filter(Boolean) as string[]);

  const more = profile?.completed
    ? selectMoreStoriesForFeed(
        dashboard.stories,
        excludeSlugs,
        profile,
        dashboard.userIntelligence,
        true
      )
    : dashboard.stories.filter((s) => !excludeSlugs.has(s.slug)).slice(0, 20);

  const corpusPool = briefingCorpusForCadence(dashboard.globalStories, "daily").length;
  for (const mode of ["global", "for-you"] as const) {
    const briefing = dashboard.briefings[mode];
    if (!briefing) continue;
    logBriefingProvenance("api-response", "daily", mode, briefing, corpusPool);
  }

  return {
    ok: true,
    version: "v1",
    profile,
    stories: dashboard.stories,
    globalStories: dashboard.globalStories,
    userIntelligence: dashboard.userIntelligence,
    briefings: dashboard.briefings,
    sections: {
      leadSlug: lead?.slug ?? null,
      relevantSlugs: relevant.map((s) => s.slug),
      topSlugs: top.map((s) => s.slug),
      moreStoriesSlugs: more.map((s) => s.slug),
    },
    meta: {
      fetchedAt: dashboard.fetchedAt,
      intelligenceUpdatedAt: dashboard.intelligenceUpdatedAt,
      hasIntelligenceSnapshot: dashboard.hasIntelligenceSnapshot,
      persistenceConfigured: dashboard.persistenceConfigured,
      cacheStatus: dashboard.cacheStatus,
      feedError: dashboard.error,
      fromPersistentStore: dashboard.fromPersistentStore,
    },
    ...(options?.debug ? { debug: options.debug } : {}),
  };
}
