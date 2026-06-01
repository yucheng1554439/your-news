import { isLeadCandidate } from "@/lib/editorial/lead-eligibility";
import { scoreStoryForReader } from "@/lib/briefing/reader-scoring";
import {
  isCriticalForDisplay,
  scoreStoryImportance,
} from "@/lib/importance-scoring";
import { isCriticalForUser, computePersonalizedImportance } from "@/lib/personalization/importance";
import {
  computeUserRelevanceScore,
} from "@/lib/personalization/engine";
import { computeSemanticRelevance } from "@/lib/personalization/relevance";
import { behaviorSignalsFromIntelligence } from "@/lib/personalization/behavior-signals";
import { signalsFromProfile } from "@/lib/personalization/signals";
import {
  getStrategicSignal,
  getSignalClass,
  isNoiseStory,
  meetsCriticalBar,
} from "@/lib/signal/strategic-score";
import {
  assessStoryRelevance,
  passesIntelligenceGate,
  passesRelevantToYouGate,
  selectRelevantStoriesForUser,
  selectTopStoriesForUser,
} from "@/lib/personalization/relevance-gate";
import { computeStrategicRelevance } from "@/lib/ranking/strategic-relevance";
import { getFeaturedStory } from "@/lib/data/featured";
import {
  getGlobalStories,
  getPersonalizedStories,
} from "@/lib/personalization";
import { filterStoriesByCategory } from "@/lib/feed/category-filter";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import type { OnboardingProfile, Story } from "@/lib/types";

export type HomepagePlacement =
  | "lead"
  | "relevant"
  | "top_stories"
  | "feed"
  | "global_feed";

export type RankSignal = {
  name: string;
  value: number | string | boolean;
  role: string;
};

export type StoryRankExplanation = {
  storyId: string;
  slug: string;
  headline: string;
  placement: HomepagePlacement;
  rankIndex: number;
  feedMode: "global" | "for-you";
  whyRankedHere: string[];
  whyCritical: string[] | null;
  whyShownToUser: string[];
  primarySignal: string;
  signals: RankSignal[];
  isNoise: boolean;
  signalClass: string;
  importanceLabel?: string;
  importanceScore?: number;
  strategicSignal: number;
};

function explainCritical(
  story: Story,
  profile: OnboardingProfile,
  personalized: boolean,
  intelligence?: UserIntelligenceProfile | null
): string[] | null {
  if (isNoiseStory(story)) return null;

  const reasons: string[] = [];
  const signals = signalsFromProfile(
    profile,
    behaviorSignalsFromIntelligence(intelligence)
  );

  if (personalized && isCriticalForUser(story, signals)) {
    reasons.push(
      `personalized importance ${computePersonalizedImportance(story, signals)}/10`
    );
    if (meetsCriticalBar(story)) reasons.push("meets critical impact bar");
    return reasons.length ? reasons : null;
  }

  if (!personalized && isCriticalForDisplay(story)) {
    reasons.push(`editorial importance ${story.importanceScore ?? "?"}/10`);
    if (meetsCriticalBar(story)) reasons.push("meets critical impact bar");
    if ((story.importanceLabel ?? "") === "Critical") {
      reasons.push("importanceLabel=Critical");
    }
    return reasons.length ? reasons : null;
  }

  if (story.importanceLabel === "Critical" && !meetsCriticalBar(story)) {
    return ["label Critical but failed meetsCriticalBar gate — should not display"];
  }

  return null;
}

function collectSignals(
  story: Story,
  profile: OnboardingProfile,
  personalized: boolean,
  intelligence?: UserIntelligenceProfile | null
): RankSignal[] {
  const semantic = computeSemanticRelevance(story, profile);
  const strategic = getStrategicSignal(story);
  const reader = scoreStoryForReader(story, profile, intelligence);
  const relevance = computeUserRelevanceScore(story, profile, intelligence);
  const editorial = scoreStoryImportance(story);

  const assessment = assessStoryRelevance(story, profile, intelligence);
  const strategicRelevance = computeStrategicRelevance(
    story,
    profile,
    intelligence
  );

  return [
    { name: "userRelevanceScore", value: relevance, role: "final sort key" },
    {
      name: "strategicRelevance",
      value: strategicRelevance.composite.toFixed(3),
      role: "unified placement score",
    },
    {
      name: "actionability",
      value: strategicRelevance.actionability.toFixed(3),
      role: "AI + editorial actionability",
    },
    { name: "relevanceComposite", value: assessment.composite, role: "early gate score" },
    {
      name: "passesIntelligence",
      value: passesIntelligenceGate(story, profile, intelligence),
      role: "token spend gate",
    },
    {
      name: "passesRelevantToYou",
      value: passesRelevantToYouGate(story, profile, intelligence),
      role: "Relevant row gate",
    },
    { name: "semanticRelevance", value: semantic, role: "onboarding match" },
    { name: "strategicSignal", value: strategic, role: "signal vs noise" },
    { name: "signalClass", value: getSignalClass(story), role: "signal/noise" },
    { name: "importanceScore", value: editorial, role: "editorial weight" },
    { name: "importanceLabel", value: story.importanceLabel ?? "unset", role: "display label" },
    { name: "behaviorReaderScore", value: reader, role: "UIP behavior" },
    {
      name: "behaviorWeight",
      value: intelligence?.behaviorWeight ?? 0,
      role: "behavior blend",
    },
    {
      name: "clusterSize",
      value: story.clusterSize ?? 1,
      role: "corroboration",
    },
    {
      name: "isLeadCandidate",
      value: isLeadCandidate(story),
      role: "hero eligibility",
    },
    {
      name: "isNoise",
      value: isNoiseStory(story),
      role: "noise filter",
    },
    {
      name: "personalized",
      value: personalized,
      role: "feed mode",
    },
  ];
}

function whyRanked(
  story: Story,
  placement: HomepagePlacement,
  rankIndex: number,
  profile: OnboardingProfile,
  personalized: boolean,
  intelligence?: UserIntelligenceProfile | null
): string[] {
  const lines: string[] = [];
  const strategic = getStrategicSignal(story);
  const assessment = assessStoryRelevance(story, profile, intelligence);

  if (isNoiseStory(story)) {
    lines.push("noise story — should not appear in signal placements");
  }

  switch (placement) {
    case "lead":
      lines.push("selected as lead via isLeadCandidate + featured picker");
      if (isLeadCandidate(story)) {
        lines.push(`strategic=${strategic.toFixed(2)}, importance=${story.importanceScore ?? "?"}`);
      } else {
        lines.push("fallback: no lead candidates — top editorial story");
      }
      break;
    case "relevant":
      lines.push(`rank #${rankIndex + 1} in Relevant to You (passesRelevantToYou gate)`);
      lines.push(
        `relevance composite=${assessment.composite.toFixed(2)} profile=${assessment.profile.toFixed(2)} strategic=${assessment.strategic.toFixed(2)}`
      );
      lines.push(
        `userRelevance=${computeUserRelevanceScore(story, profile, intelligence).toFixed(2)}`
      );
      break;
    case "top_stories":
      lines.push(`rank #${rankIndex + 1} in Top Stories (category=all pool)`);
      break;
    case "feed":
      lines.push(`rank #${rankIndex + 1} in active feed`);
      break;
    case "global_feed":
      lines.push(`rank #${rankIndex + 1} in Global editorial feed`);
      lines.push(`editorial importance=${story.importanceScore ?? "?"}`);
      break;
  }

  if (personalized) {
    lines.push(
      `semantic relevance to profile=${computeSemanticRelevance(story, profile).toFixed(2)}`
    );
  }

  return lines;
}

function whyShown(
  story: Story,
  profile: OnboardingProfile,
  personalized: boolean,
  intelligence?: UserIntelligenceProfile | null
): string[] {
  const lines: string[] = [];

  if (personalized) {
    lines.push(`interests: ${profile.interests.join(", ") || "none"}`);
    if (profile.career) lines.push(`career: ${profile.career}`);
    if (intelligence?.effectiveLens) {
      lines.push(`UIP lens: ${intelligence.effectiveLens}`);
    }
    if (intelligence?.savedSlugs.includes(story.slug)) {
      lines.push("saved by user — strong personalization signal");
    }
    if (intelligence?.openedSlugs.includes(story.slug)) {
      lines.push("opened recently — behavior signal");
    }
  } else {
    lines.push("Global mode — editorial significance, not personalized");
  }

  if (isNoiseStory(story)) {
    lines.push("WARNING: noise story visible — check category filter");
  }

  return lines;
}

function primarySignal(signals: RankSignal[]): string {
  const relevance = signals.find((s) => s.name === "userRelevanceScore");
  const strategic = signals.find((s) => s.name === "strategicSignal");
  const noise = signals.find((s) => s.name === "isNoise");
  if (noise?.value === true) return "noise (should be filtered)";
  if (typeof relevance?.value === "number" && relevance.value > 8) {
    return "high user relevance";
  }
  if (typeof strategic?.value === "number" && strategic.value >= 0.5) {
    return "strong strategic signal";
  }
  if (typeof relevance?.value === "number" && relevance.value > 4) {
    return "profile semantic match";
  }
  return "editorial importance + recency";
}

export function explainStoryRank(
  story: Story,
  placement: HomepagePlacement,
  rankIndex: number,
  profile: OnboardingProfile,
  feedMode: "global" | "for-you",
  intelligence?: UserIntelligenceProfile | null
): StoryRankExplanation {
  const personalized = feedMode === "for-you";
  const signals = collectSignals(story, profile, personalized, intelligence);

  return {
    storyId: story.slug,
    slug: story.slug,
    headline: story.headline,
    placement,
    rankIndex,
    feedMode,
    whyRankedHere: whyRanked(
      story,
      placement,
      rankIndex,
      profile,
      personalized,
      intelligence
    ),
    whyCritical: explainCritical(story, profile, personalized, intelligence),
    whyShownToUser: whyShown(story, profile, personalized, intelligence),
    primarySignal: primarySignal(signals),
    signals,
    isNoise: isNoiseStory(story),
    signalClass: getSignalClass(story),
    importanceLabel: story.importanceLabel,
    importanceScore: story.importanceScore,
    strategicSignal: getStrategicSignal(story),
  };
}

export type HomepageRankAudit = {
  generatedAt: string;
  feedMode: "global" | "for-you";
  profileInterests: string[];
  explanations: StoryRankExplanation[];
};

export function auditHomepagePlacements(
  personalStories: Story[],
  globalStories: Story[],
  profile: OnboardingProfile,
  intelligence?: UserIntelligenceProfile | null
): HomepageRankAudit[] {
  const audits: HomepageRankAudit[] = [];

  for (const feedMode of ["for-you", "global"] as const) {
    const personalized = feedMode === "for-you";
    const pool = personalized ? personalStories : globalStories;
    const feedStories = personalized
      ? getPersonalizedStories(profile, pool, undefined, intelligence)
      : getGlobalStories(globalStories.length > 0 ? globalStories : pool);

    const explanations: StoryRankExplanation[] = [];
    const seen = new Set<string>();

    const add = (
      story: Story | undefined,
      placement: HomepagePlacement,
      rankIndex: number
    ) => {
      if (!story || seen.has(`${placement}:${story.slug}`)) return;
      seen.add(`${placement}:${story.slug}`);
      explanations.push(
        explainStoryRank(story, placement, rankIndex, profile, feedMode, intelligence)
      );
    };

    const featured = getFeaturedStory(
      feedStories.length > 0 ? feedStories : pool,
      profile,
      personalized,
      intelligence
    );
    add(featured, "lead", 0);

    if (personalized) {
      selectRelevantStoriesForUser(feedStories, profile, intelligence, 4).forEach(
        (s, i) => add(s, "relevant", i)
      );
    } else {
      feedStories.slice(0, 4).forEach((s, i) => add(s, "relevant", i));
    }

    const topPool = filterStoriesByCategory(feedStories, "all");
    const topRanked = personalized
      ? selectTopStoriesForUser(topPool, profile, intelligence, 6)
      : topPool.slice(0, 6);
    topRanked.forEach((s, i) => add(s, "top_stories", i));

    feedStories.slice(0, 12).forEach((s, i) => add(s, "feed", i));

    if (!personalized) {
      globalStories.slice(0, 12).forEach((s, i) => add(s, "global_feed", i));
    }

    audits.push({
      generatedAt: new Date().toISOString(),
      feedMode,
      profileInterests: profile.interests,
      explanations,
    });
  }

  return audits;
}

export function logHomepageRankAudit(audits: HomepageRankAudit[]): void {
  for (const audit of audits) {
    console.log(
      `[HOMEPAGE_RANK] mode=${audit.feedMode} stories=${audit.explanations.length}`
    );
    for (const ex of audit.explanations) {
      console.log(
        `[HOMEPAGE_RANK]`,
        JSON.stringify(
          {
            placement: ex.placement,
            rankIndex: ex.rankIndex,
            storyId: ex.storyId,
            slug: ex.slug,
            headline: ex.headline.slice(0, 80),
            primarySignal: ex.primarySignal,
            whyRankedHere: ex.whyRankedHere,
            whyCritical: ex.whyCritical,
            whyShownToUser: ex.whyShownToUser,
            isNoise: ex.isNoise,
            signalClass: ex.signalClass,
            importanceLabel: ex.importanceLabel,
          },
          null,
          0
        )
      );
    }
  }
}
