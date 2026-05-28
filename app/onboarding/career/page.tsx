"use client";

import { useUser } from "@clerk/nextjs";
import { OnboardingLayout } from "@/components/OnboardingLayout";
import { CareerStep } from "@/components/personalize/CareerStep";

export default function CareerPage() {
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
      step={2}
      totalSteps={3}
      title="What best describes you?"
      subtitle="We'll tune signal relevance to your professional lens."
      backHref="/onboarding/interests"
    >
      <CareerStep userId={userId} flow="onboarding" />
    </OnboardingLayout>
  );
}
