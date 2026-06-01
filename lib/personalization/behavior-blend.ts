import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";

/** How much behavioral signals should override onboarding (0–1). */
export function computeBehaviorWeight(
  confidence: number,
  savedCount = 0
): number {
  if (confidence < 0.15 && savedCount === 0) return 0;

  let w = 0;
  if (confidence < 0.4) w = confidence * 0.45;
  else if (confidence < 0.6) w = 0.15 + confidence * 0.42;
  else w = 0.28 + confidence * 0.52;

  if (savedCount >= 1) {
    w = Math.max(w, 0.42 + Math.min(0.28, savedCount * 0.06));
  }

  return Math.min(0.85, w);
}

export function computeBehaviorConfidence(input: {
  savedCount: number;
  openCount: number;
  refreshCount: number;
  categoryEngagements: number;
  totalDwellMs: number;
  sessionCount: number;
}): number {
  const dwellMinutes = input.totalDwellMs / 60_000;
  const deepOpens = Math.min(input.openCount, dwellMinutes * 0.8);

  return Math.min(
    1,
    input.savedCount * 0.24 +
      deepOpens * 0.04 +
      input.openCount * 0.012 +
      input.refreshCount * 0.025 +
      input.categoryEngagements * 0.01 +
      dwellMinutes * 0.05 +
      input.sessionCount * 0.018
  );
}

export function blendScores(
  onboardingScore: number,
  behaviorScore: number,
  intelligence: UserIntelligenceProfile | null | undefined
): number {
  if (!intelligence || intelligence.behaviorWeight <= 0) return onboardingScore;
  const w = intelligence.behaviorWeight;
  return onboardingScore * (1 - w) + (onboardingScore + behaviorScore) * w;
}
