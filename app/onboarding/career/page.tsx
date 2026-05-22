"use client";

import { OnboardingLayout } from "@/components/OnboardingLayout";
import { CareerStep } from "@/components/personalize/CareerStep";
import { useOnboardingSync } from "@/hooks/use-onboarding-sync";

export default function CareerPage() {
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
      step={2}
      totalSteps={3}
      title="What best describes you?"
      subtitle="We'll tune signal relevance to your professional lens."
      backHref="/onboarding/interests"
    >
      <CareerStep key={userId} userId={userId} flow="onboarding" />
    </OnboardingLayout>
  );
}
