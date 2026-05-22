"use client";

import { OnboardingLayout } from "@/components/OnboardingLayout";
import { InterestsStep } from "@/components/personalize/InterestsStep";
import { useOnboardingSync } from "@/hooks/use-onboarding-sync";

export default function InterestsPage() {
  const { synced, userId } = useOnboardingSync();

  if (!synced || !userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-6 w-6 animate-pulse rounded-full border border-white/20 border-t-white" />
      </div>
    );
  }

  return (
    <OnboardingLayout
      step={1}
      totalSteps={3}
      title="What matters to you?"
      subtitle="Select the domains you want your intelligence briefing to prioritize."
    >
      <InterestsStep key={userId} userId={userId} flow="onboarding" />
    </OnboardingLayout>
  );
}
