"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Layers,
  Zap,
  Newspaper,
  BarChart3,
  FileText,
  BookOpen,
} from "lucide-react";
import { OnboardingCard } from "@/components/OnboardingCard";
import { OnboardingLayout } from "@/components/OnboardingLayout";
import { Button } from "@/components/ui/button";
import { useAdvanceOnboarding } from "@/components/personalize/useAdvanceOnboarding";
import { getOnboardingProfile } from "@/lib/onboarding";
import type { FocusType, Tone } from "@/lib/types";

const focusOptions = [
  { id: "breadth" as FocusType, label: "Broad awareness", description: "Wide coverage across your interest areas", icon: Layers },
  { id: "depth" as FocusType, label: "Deep analysis", description: "Longer reads with strategic context", icon: BookOpen },
  { id: "breaking" as FocusType, label: "Breaking signal", description: "Critical developments as they emerge", icon: Zap },
];

const toneOptions = [
  { id: "analytical" as Tone, label: "Analytical", description: "Data-driven, implications-focused", icon: BarChart3 },
  { id: "concise" as Tone, label: "Concise", description: "Essential facts, minimal prose", icon: FileText },
  { id: "narrative" as Tone, label: "Narrative", description: "Editorial flow with context", icon: Newspaper },
];

function PreferencesForm({ userId }: { userId: string }) {
  const profile = getOnboardingProfile(userId);
  const { advance, saving, error } = useAdvanceOnboarding();
  const [focus, setFocus] = useState<FocusType | null>(profile.focusType);
  const [tone, setTone] = useState<Tone | null>(profile.tone);

  const finish = () => {
    if (!focus || !tone) return;
    void advance({
      userId,
      partial: { focusType: focus, tone, completed: true },
      nextPath: "/",
      reloadClerkOnFinish: true,
    });
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.15em] text-zinc-500">
            Focus
          </p>
          <div className="space-y-3">
            {focusOptions.map((opt) => (
              <OnboardingCard
                key={opt.id}
                id={opt.id}
                label={opt.label}
                description={opt.description}
                icon={opt.icon}
                selected={focus === opt.id}
                onSelect={() => setFocus(opt.id)}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.15em] text-zinc-500">
            Tone
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {toneOptions.map((opt) => (
              <OnboardingCard
                key={opt.id}
                id={opt.id}
                label={opt.label}
                description={opt.description}
                icon={opt.icon}
                selected={tone === opt.id}
                onSelect={() => setTone(opt.id)}
              />
            ))}
          </div>
        </div>
      </div>
      {error && (
        <p className="text-center text-sm text-red-400">{error}</p>
      )}
      <Button
        className="w-full rounded-full bg-white text-zinc-950 hover:bg-zinc-200"
        disabled={!focus || !tone || saving}
        onClick={finish}
      >
        {saving ? "Saving…" : "Enter your briefing"}
      </Button>
    </>
  );
}

export default function PreferencesPage() {
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
      step={3}
      totalSteps={3}
      title="Fine-tune your briefing"
      subtitle="How should Your News deliver intelligence to you?"
      backHref="/onboarding/career"
    >
      <PreferencesForm userId={userId} />
    </OnboardingLayout>
  );
}
