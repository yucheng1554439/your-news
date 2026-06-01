import type { Story } from "@/lib/types";

/** Language indicating the intelligence layer judged the story off-profile. */
export const AI_IRRELEVANCE_PATTERN =
  /\b(not relevant|outside your|outside core interests|no direct bearing|does not affect|does not directly affect|sit outside|not aligned with|low relevance to your|unrelated to your|outside your core|has no direct bearing|little bearing on your|minimal relevance|not material to your|this story sits outside)\b/i;

/** AI judged peripheral / indirect / not actionable — demote in ranking. */
export const AI_LOW_VALUE_PATTERN =
  /\b(peripheral|indirect|not actionable|low priority|limited impact|unlikely to affect|tangential|does not require action|no immediate action|outside your lane|entertainment purposes|human interest|minimal bearing|low materiality|not material to your work|outside core interests|not directly relevant to your)\b/i;

export function intelligenceTextBlob(story: Story): string {
  return [
    story.whyItMattersToYou,
    story.whyItMatters,
    story.summary,
  ]
    .filter(Boolean)
    .join(" ");
}

export function intelligenceDeclaresIrrelevant(story: Story): boolean {
  const blob = intelligenceTextBlob(story);
  if (!blob.trim()) return false;
  return AI_IRRELEVANCE_PATTERN.test(blob);
}

export function intelligenceDeclaresLowValue(story: Story): boolean {
  const blob = intelligenceTextBlob(story);
  if (!blob.trim()) return false;
  return (
    intelligenceDeclaresIrrelevant(story) || AI_LOW_VALUE_PATTERN.test(blob)
  );
}

export function irrelevancePenaltyMultiplier(story: Story): number {
  return intelligenceDeclaresLowValue(story) ? 0.04 : 1;
}
