import "server-only";

import {
  explainSignalMomentum,
  relatedStoriesForSignal,
  whySignalMatters,
} from "@/lib/signals/explain";
import {
  computeSignalPersonalRelevance,
  computeSignalsDashboard,
  type SignalMomentumRow,
} from "@/lib/signals/momentum";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import type { OnboardingProfile, Story } from "@/lib/types";

export type SignalApiItem = {
  id: string;
  label: string;
  direction: "rising" | "falling";
  sourceCount: number;
  storyCount: number;
  explanation: string;
  whyItMatters: string;
  relevance: {
    tier: "high" | "medium" | "low";
    stars: number;
    label: string;
  };
  relatedStories: {
    slug: string;
    headline: string;
    source: string;
    publishedAt: string;
  }[];
};

export type SignalsApiPayload = {
  ok: true;
  lensLabel: string;
  generatedAt: number;
  rising: SignalApiItem[];
  falling: SignalApiItem[];
};

function serializeRow(
  row: SignalMomentumRow,
  direction: "rising" | "falling",
  stories: Story[],
  profile: OnboardingProfile | null,
  intelligence: UserIntelligenceProfile | null
): SignalApiItem {
  return {
    id: row.id,
    label: row.label,
    direction,
    sourceCount: row.sourceCount,
    storyCount: row.storyCount,
    explanation: explainSignalMomentum(row.id, direction, stories),
    whyItMatters: whySignalMatters(row.id),
    relevance: computeSignalPersonalRelevance(row.id, profile, intelligence),
    relatedStories: relatedStoriesForSignal(row.id, stories, 5),
  };
}

export function serializeSignalsApi(
  stories: Story[],
  profile: OnboardingProfile | null,
  intelligence: UserIntelligenceProfile | null,
  personalized = true
): SignalsApiPayload {
  const model = computeSignalsDashboard(
    stories,
    profile,
    intelligence,
    personalized
  );

  return {
    ok: true,
    lensLabel: model.lensLabel,
    generatedAt: Date.now(),
    rising: model.rising.map((row) =>
      serializeRow(row, "rising", stories, profile, intelligence)
    ),
    falling: model.falling.map((row) =>
      serializeRow(row, "falling", stories, profile, intelligence)
    ),
  };
}

export function findSignalInPayload(
  payload: SignalsApiPayload,
  signalId: string
): SignalApiItem | undefined {
  return (
    payload.rising.find((s) => s.id === signalId) ??
    payload.falling.find((s) => s.id === signalId)
  );
}
