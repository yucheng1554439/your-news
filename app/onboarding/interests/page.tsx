"use client";

import { useUser } from "@clerk/nextjs";
import { OnboardingLayout } from "@/components/OnboardingLayout";
import { InterestsStep } from "@/components/personalize/InterestsStep";

export default function InterestsPage() {
  const { isLoaded, user } = useUser();
  const userId = user?.id;

  if (!isLoaded || !userId) {
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
      <InterestsStep userId={userId} flow="onboarding" />
    </OnboardingLayout>
  );
}
