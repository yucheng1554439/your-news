import { compareByEditorialImportance } from "@/lib/importance-scoring";
import { isCriticalForUser } from "@/lib/personalization/importance";
import { isLeadCandidate } from "@/lib/editorial/lead-eligibility";
import { isLowSignalStory } from "@/lib/signal/strategic-score";
import { signalsFromProfile } from "@/lib/personalization/signals";
import type { OnboardingProfile, Story } from "@/lib/types";

export function getFeaturedStory(
  stories: Story[],
  profile?: OnboardingProfile | null,
  personalized = false
): Story | undefined {
  const eligible = stories.filter(
    (s) => isLeadCandidate(s) && !isLowSignalStory(s)
  );
  if (eligible.length === 0) {
    const fallback = stories.filter((s) => !isLowSignalStory(s));
    if (fallback.length === 0) return stories[0];
    return [...fallback].sort(compareByEditorialImportance)[0];
  }

  if (personalized && profile?.completed) {
    const signals = signalsFromProfile(profile);
    const critical = eligible.find((s) => isCriticalForUser(s, signals));
    if (critical) return critical;
    return eligible[0];
  }

  const critical = eligible.find(
    (s) => s.importanceLabel === "Critical" || s.importance === "critical"
  );
  if (critical) return critical;

  return eligible[0];
}
