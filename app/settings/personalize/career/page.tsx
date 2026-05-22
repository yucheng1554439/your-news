"use client";

import { PersonalizeLayout } from "@/components/personalize/PersonalizeLayout";
import { CareerStep } from "@/components/personalize/CareerStep";
import { useOnboardingSync } from "@/hooks/use-onboarding-sync";
import { SETTINGS_PERSONALIZE_STEPS } from "@/lib/personalize/routes";

export default function SettingsPersonalizeCareerPage() {
  const { synced, userId } = useOnboardingSync();

  if (!synced || !userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-6 w-6 animate-pulse rounded-full border border-white/20 border-t-white" />
      </div>
    );
  }

  return (
    <PersonalizeLayout
      step={2}
      totalSteps={SETTINGS_PERSONALIZE_STEPS}
      title="Update your career lens"
      subtitle="We'll tune relevance to your professional vantage point."
      backHref="/settings/personalize/interests"
    >
      <CareerStep key={userId} userId={userId} flow="settings" />
    </PersonalizeLayout>
  );
}
