import { scoreStoryForReader } from "@/lib/briefing/reader-scoring";
import {
  SIGNAL_DEFINITIONS,
  storyMatchesSignal,
  resolveSignalLabel,
} from "@/lib/signals/catalog";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import type { OnboardingProfile, Story } from "@/lib/types";

const MS_PER_HOUR = 60 * 60 * 1000;
const RECENT_HOURS = 48;
const PRIOR_HOURS = 168;

export type SignalMomentumRow = {
  id: string;
  label: string;
  momentum: number;
  recentWeight: number;
  priorWeight: number;
  storyCount: number;
  sourceCount: number;
};

export type SignalsDashboardModel = {
  rising: SignalMomentumRow[];
  falling: SignalMomentumRow[];
  lensLabel: string;
};

function hoursSince(publishedAt: string, now: number): number {
  const t = Date.parse(publishedAt);
  if (!Number.isFinite(t)) return 999;
  return (now - t) / MS_PER_HOUR;
}

function storyDeskWeight(story: Story, now: number): number {
  const hours = hoursSince(story.publishedAt, now);
  let recency = 0.65;
  if (hours <= 12) recency = 1.45;
  else if (hours <= 24) recency = 1.25;
  else if (hours <= 48) recency = 1.05;
  else if (hours <= 96) recency = 0.85;

  const importance = (story.importanceScore ?? 5) / 10;
  const strategic = (story.strategicSignal ?? 0.4) * 1.4;
  const corroboration = (story.corroborationScore ?? 0) * 1.2;
  const cluster =
    (story.clusterSize ?? 1) > 1 ? Math.min(1.5, 1 + (story.clusterSize ?? 1) * 0.08) : 1;

  return recency * (0.55 + importance + strategic + corroboration) * cluster;
}

function personalizationBoost(
  defId: string,
  profile: OnboardingProfile | null,
  intelligence: UserIntelligenceProfile | null
): number {
  let boost = 1;

  if (intelligence) {
    const tags = intelligence.primaryTags ?? intelligence.topTags;
    for (const t of tags) {
      if (t.tag === defId || t.label.toLowerCase().includes(defId.replace(/-/g, " "))) {
        boost += 0.35 * intelligence.behaviorWeight;
      }
    }
    for (const t of intelligence.topSecondaryTags ?? []) {
      const def = SIGNAL_DEFINITIONS.find((d) => d.id === defId);
      if (def?.secondary?.includes(t.label)) {
        boost += 0.25 * intelligence.behaviorWeight;
      }
    }
    for (const ignored of [...intelligence.ignoredThemes, ...intelligence.ignoredCategories]) {
      if (ignored.toLowerCase().includes(defId.replace(/-/g, " "))) {
        boost -= 0.4 * intelligence.behaviorWeight;
      }
    }
  }

  if (profile?.career && !intelligence?.behaviorConfidence) {
    const careerBoosts: Record<NonNullable<OnboardingProfile["career"]>, string[]> = {
      investor: ["rates-liquidity", "energy-risk", "china-capital", "semiconductors"],
      engineer: [
        "ai-infrastructure",
        "semiconductors",
        "open-source-models",
        "datacenter-build",
      ],
      founder: ["saas-enterprise", "ai-infrastructure", "rates-liquidity"],
      executive: ["china-capital", "policy-regulation", "energy-risk"],
      researcher: ["policy-regulation", "open-source-models", "energy-risk"],
    };
    if (careerBoosts[profile.career]?.includes(defId)) boost += 0.2;
  }

  return Math.max(0.5, Math.min(1.8, boost));
}

function behaviorStoryBoost(
  story: Story,
  profile: OnboardingProfile | null,
  intelligence: UserIntelligenceProfile | null
): number {
  if (!profile || !intelligence) return 1;
  const reader = scoreStoryForReader(story, profile, intelligence);
  if (reader <= 0) return 1;
  return 1 + Math.min(0.5, reader * 0.06 * intelligence.behaviorWeight);
}

export function computeSignalsDashboard(
  stories: Story[],
  profile: OnboardingProfile | null,
  intelligence: UserIntelligenceProfile | null,
  personalized: boolean
): SignalsDashboardModel {
  const now = Date.now();
  const rows: SignalMomentumRow[] = [];

  for (const def of SIGNAL_DEFINITIONS) {
    let recentWeight = 0;
    let priorWeight = 0;
    const sources = new Set<string>();
    let storyCount = 0;

    for (const story of stories) {
      if (!storyMatchesSignal(story, def)) continue;

      const hours = hoursSince(story.publishedAt, now);
      if (hours > PRIOR_HOURS) continue;

      storyCount += 1;
      sources.add(story.source);

      let w = storyDeskWeight(story, now);
      if (personalized) {
        w *= personalizationBoost(def.id, profile, intelligence);
        w *= behaviorStoryBoost(story, profile, intelligence);
      }

      if (hours <= RECENT_HOURS) {
        recentWeight += w;
      } else {
        priorWeight += w;
      }
    }

    if (storyCount === 0) continue;

    const momentum =
      (recentWeight - priorWeight) / Math.max(priorWeight, recentWeight, 0.75, 1);

    rows.push({
      id: def.id,
      label: def.label,
      momentum,
      recentWeight,
      priorWeight,
      storyCount,
      sourceCount: sources.size,
    });
  }

  const minRecent = 1.2;
  const minMomentum = 0.12;

  const rising = rows
    .filter(
      (r) =>
        r.momentum >= minMomentum &&
        r.recentWeight >= minRecent &&
        r.recentWeight > r.priorWeight * 0.85
    )
    .sort((a, b) => b.momentum - a.momentum || b.recentWeight - a.recentWeight)
    .slice(0, 5);

  const falling = rows
    .filter(
      (r) =>
        r.momentum <= -minMomentum &&
        r.priorWeight >= minRecent &&
        r.priorWeight > r.recentWeight * 1.15
    )
    .sort((a, b) => a.momentum - b.momentum || b.priorWeight - a.priorWeight)
    .slice(0, 5);

  const lensLabel = personalized
    ? intelligence && intelligence.behaviorConfidence >= 0.35
      ? `Desk tuned for ${intelligence.effectiveLens}`
      : profile?.career
        ? `Desk tuned for ${profile.career} priorities`
        : "Personal desk"
    : "Global macro & technology desk";

  return {
    rising:
      rising.length > 0
        ? rising
        : rows
            .sort((a, b) => b.recentWeight - a.recentWeight)
            .slice(0, 4)
            .map((r) => ({ ...r, momentum: Math.max(r.momentum, 0.2) })),
    falling:
      falling.length > 0
        ? falling
        : rows
            .filter((r) => r.priorWeight > 0.5)
            .sort((a, b) => a.recentWeight - b.recentWeight)
            .slice(0, 3)
            .map((r) => ({ ...r, momentum: Math.min(r.momentum, -0.15) })),
    lensLabel,
  };
}
