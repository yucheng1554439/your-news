import {
  getStorySourceTier,
  requiresCorroboration,
} from "@/lib/editorial/source-authority";
import {
  getStrategicSignal,
  isNoiseStory,
} from "@/lib/signal/strategic-score";
import { intelligenceDeclaresLowValue } from "@/lib/intelligence/irrelevance";
import type { Story } from "@/lib/types";

/** Hero / lead placement — stricter than general feed inclusion. */
export function isLeadCandidate(story: Story): boolean {
  if (isNoiseStory(story)) return false;
  if (intelligenceDeclaresLowValue(story)) return false;

  const tier = getStorySourceTier(story);
  const strategic = getStrategicSignal(story);
  const clusterSize = story.clusterSize ?? 1;
  const corroboration = story.corroborationScore ?? 0.15;

  if (tier === 3) {
    return (
      clusterSize >= 2 &&
      corroboration >= 0.45 &&
      strategic >= 0.42
    );
  }

  if (requiresCorroboration(story) && clusterSize < 2) {
    return false;
  }

  if (tier === 1) {
    return strategic >= 0.35 && (story.importanceScore ?? 0) >= 7;
  }

  if (tier === 2) {
    return (
      strategic >= 0.38 &&
      (story.importanceScore ?? 0) >= 7 &&
      (clusterSize >= 2 || corroboration >= 0.35)
    );
  }

  return false;
}
