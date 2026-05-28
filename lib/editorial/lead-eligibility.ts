import {
  getStorySourceTier,
  requiresCorroboration,
} from "@/lib/editorial/source-authority";
import { getStrategicSignal, isLowSignalStory } from "@/lib/signal/strategic-score";
import type { Story } from "@/lib/types";

/** Hero / lead placement — stricter than general feed inclusion. */
export function isLeadCandidate(story: Story): boolean {
  if (isLowSignalStory(story)) return false;

  const tier = getStorySourceTier(story);
  const strategic = getStrategicSignal(story);
  const clusterSize = story.clusterSize ?? 1;
  const corroboration = story.corroborationScore ?? 0.15;

  if (tier === 3) {
    return (
      clusterSize >= 2 &&
      corroboration >= 0.45 &&
      strategic >= 0.38
    );
  }

  if (requiresCorroboration(story) && clusterSize < 2) {
    return false;
  }

  if (tier === 1) {
    return strategic >= 0.28 && (story.importanceScore ?? 0) >= 6;
  }

  if (tier === 2) {
    return (
      strategic >= 0.32 &&
      (story.importanceScore ?? 0) >= 7 &&
      (clusterSize >= 2 || corroboration >= 0.35)
    );
  }

  return false;
}
