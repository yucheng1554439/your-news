"use client";

import { PersonalizeLayout } from "@/components/personalize/PersonalizeLayout";
import { ToneStep } from "@/components/personalize/ToneStep";
import { useOnboardingSync } from "@/hooks/use-onboarding-sync";
import { SETTINGS_PERSONALIZE_STEPS } from "@/lib/personalize/routes";

export default function SettingsPersonalizeTonePage() {
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
      step={4}
      totalSteps={SETTINGS_PERSONALIZE_STEPS}
      title="Update your tone"
      subtitle="Choose how editorial intelligence should read for you."
      backHref="/settings/personalize/focus"
    >
      <ToneStep key={userId} userId={userId} flow="settings" />
    </PersonalizeLayout>
  );
}
