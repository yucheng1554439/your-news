import { compareByEditorialImportance } from "@/lib/importance-scoring";
import { getStorySourceTier } from "@/lib/editorial/source-authority";
import {
  getFeedDomain,
  mixFeedByDomain,
  type FeedDomain,
} from "@/lib/feed/domain-buckets";
import { pickClusterRepresentatives } from "@/lib/editorial/narrative-clusters";
import { computeSemanticRelevance } from "@/lib/personalization/relevance";
import {
  assessStrategicSignal,
  getStrategicSignal,
  isLowSignalStory,
} from "@/lib/signal/strategic-score";
import type { OnboardingProfile, Story } from "@/lib/types";

/** Culture/holiday explainers — not weekly strategic narratives unless corroborated + macro-linked. */
const CULTURE_EXPLAINER =
  /\b(eid al-adha|eid al-fitr|ramadan\b|hanukkah|diwali\b|lunar new year guide|holiday explainer|what is eid|cultural tradition|religious festival|holy month|celebration of eid|festival guide|meaning of ramadan)\b/i;

const SOFT_FEATURE =
  /\b(human.interest|photo essay|style section|travel guide|recipe\b|best beaches|things to do in|weekend getaway|celebrity wedding)\b/i;

const EXPLAINER_HEADLINE =
  /^(what|why|how|who|when)\s+(is|are|was|were|do|does)\b/i;

const WEEKLY_STRATEGIC_BOOST =
  /\b(fed\b|federal reserve|rate cut|rate hike|inflation|gdp|earnings|ipo\b|merger|antitrust|sanction|tariff|opec|crude|natural gas|nvidia|tsmc|semiconductor|data center|hyperscaler|openai|anthropic|congress|regulation|ukraine|china|taiwan|nato|ceasefire|ransomware|defense spending|cloud capex)\b/i;

const MIN_WEEKLY_WEIGHT = 3.8;
const MIN_WEEKLY_WEIGHT_RELAXED = 2.6;

function storyBlob(story: Story): string {
  return `${story.headline} ${story.articleBody ?? story.rawExcerpt ?? story.summary}`;
}

function isCultureOrSoftNews(story: Story): boolean {
  const blob = storyBlob(story);
  const strategic = getStrategicSignal(story);
  const hasMacroLink = WEEKLY_STRATEGIC_BOOST.test(blob);
  const corroborated = (story.clusterSize ?? 1) >= 2 && (story.corroborationScore ?? 0) >= 0.4;
  const tier1 = getStorySourceTier(story) === 1;

  if (CULTURE_EXPLAINER.test(blob) && !hasMacroLink) {
    return !(corroborated && tier1);
  }

  if (SOFT_FEATURE.test(blob) && strategic < 0.42) {
    return true;
  }

  if (EXPLAINER_HEADLINE.test(story.headline) && strategic < 0.48 && !hasMacroLink) {
    return true;
  }

  if (getFeedDomain(story) === "general" && strategic < 0.4 && !hasMacroLink) {
    return true;
  }

  return false;
}

/** Editorial weight for weekly synthesis — not the same as feed relevance. */
export function scoreWeeklyNarrativeWeight(
  story: Story,
  profile: OnboardingProfile | null = null
): number {
  if (isLowSignalStory(story)) return 0;
  if (isCultureOrSoftNews(story)) return 0;

  const assessment = assessStrategicSignal(story);
  const strategic = assessment.strategicSignal;
  const blob = storyBlob(story);

  let score =
    strategic * 10 +
    (story.importanceScore ?? 5) * 0.35 +
    (story.corroborationScore ?? 0) * 4 +
    ((story.clusterSize ?? 1) > 1 ? 1.8 : 0);

  const tier = getStorySourceTier(story);
  if (tier === 1) score += 1.5;
  else if (tier === 2) score += 0.5;
  else score -= 1.2;

  if (WEEKLY_STRATEGIC_BOOST.test(blob)) score += 2.2;
  if (assessment.reasons.length >= 2) score += 1;

  const domain = getFeedDomain(story);
  if (domain === "general") score -= 2.5;
  if (domain === "markets" || domain === "geopolitics" || domain === "ai-tech") {
    score += 1.2;
  }

  if (profile?.completed) {
    score += computeSemanticRelevance(story, profile) * 0.25;
  }

  return Math.max(0, score);
}

export function rankStoriesForWeeklyNarrative(
  stories: Story[],
  profile: OnboardingProfile | null = null
): Story[] {
  const scored = stories
    .map((story) => ({
      story,
      weight: scoreWeeklyNarrativeWeight(story, profile),
    }))
    .filter((row) => row.weight >= MIN_WEEKLY_WEIGHT_RELAXED);

  if (scored.filter((r) => r.weight >= MIN_WEEKLY_WEIGHT).length < 6) {
    return scored
      .sort((a, b) => b.weight - a.weight)
      .map((r) => r.story);
  }

  return scored
    .filter((r) => r.weight >= MIN_WEEKLY_WEIGHT)
    .sort((a, b) => {
      const diff = b.weight - a.weight;
      if (Math.abs(diff) > 0.4) return diff > 0 ? 1 : -1;
      return compareByEditorialImportance(a.story, b.story);
    })
    .map((r) => r.story);
}

const WEEKLY_DOMAIN_CAP: Partial<Record<FeedDomain, number>> = {
  general: 1,
  "science-health": 2,
};

/**
 * Weekly pool: strategic narrative reps only — clusters, corroboration, domain caps.
 */
export function selectWeeklyStrategicPool(
  stories: Story[],
  limit = 12,
  profile: OnboardingProfile | null = null
): Story[] {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - weekMs;
  const recent = stories.filter(
    (s) => new Date(s.publishedAt).getTime() >= cutoff
  );
  const pool = recent.length >= 6 ? recent : stories;

  const ranked = rankStoriesForWeeklyNarrative(pool, profile);
  if (ranked.length === 0) {
    return pickClusterRepresentatives(
      pool.filter((s) => !isLowSignalStory(s)),
      limit
    ).slice(0, limit);
  }

  const narratives = pickClusterRepresentatives(ranked, limit * 2);
  const byWeight = [...narratives].sort((a, b) => {
    const diff =
      scoreWeeklyNarrativeWeight(b, profile) - scoreWeeklyNarrativeWeight(a, profile);
    if (Math.abs(diff) > 0.35) return diff > 0 ? 1 : -1;
    return compareByEditorialImportance(a, b);
  });

  const selected: Story[] = [];
  const used = new Set<string>();
  const domainCounts = new Map<FeedDomain, number>();

  for (const story of byWeight) {
    if (selected.length >= limit) break;
    const domain = getFeedDomain(story);
    const cap = WEEKLY_DOMAIN_CAP[domain] ?? 3;
    const count = domainCounts.get(domain) ?? 0;
    if (count >= cap) continue;
    if (used.has(story.slug)) continue;
    if (scoreWeeklyNarrativeWeight(story, profile) < MIN_WEEKLY_WEIGHT_RELAXED) {
      continue;
    }
    used.add(story.slug);
    domainCounts.set(domain, count + 1);
    selected.push(story);
  }

  if (selected.length < limit) {
    const mixed = mixFeedByDomain(byWeight, {
      limit: limit - selected.length,
      picksPerDomain: 1,
    });
    for (const story of mixed) {
      if (selected.length >= limit) break;
      if (used.has(story.slug)) continue;
      if (isCultureOrSoftNews(story)) continue;
      used.add(story.slug);
      selected.push(story);
    }
  }

  return selected.slice(0, limit);
}
