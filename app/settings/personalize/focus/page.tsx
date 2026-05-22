"use client";

import { PersonalizeLayout } from "@/components/personalize/PersonalizeLayout";
import { FocusStep } from "@/components/personalize/FocusStep";
import { useOnboardingSync } from "@/hooks/use-onboarding-sync";
import { SETTINGS_PERSONALIZE_STEPS } from "@/lib/personalize/routes";

export default function SettingsPersonalizeFocusPage() {
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
      step={3}
      totalSteps={SETTINGS_PERSONALIZE_STEPS}
      title="Update your focus"
      subtitle="How should Your News prioritize signal for you?"
      backHref="/settings/personalize/career"
    >
      <FocusStep key={userId} userId={userId} flow="settings" />
    </PersonalizeLayout>
  );
}
