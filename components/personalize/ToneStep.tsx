"use client";

import { useState } from "react";
import { BarChart3, FileText, Newspaper } from "lucide-react";
import { OnboardingCard } from "@/components/OnboardingCard";
import { Button } from "@/components/ui/button";
import { useAdvanceOnboarding } from "@/components/personalize/useAdvanceOnboarding";
import { getOnboardingProfile } from "@/lib/onboarding";
import { getPersonalizeRoutes, type PersonalizeFlow } from "@/lib/personalize/routes";
import type { Tone } from "@/lib/types";

const toneOptions: {
  id: Tone;
  label: string;
  description: string;
  icon: typeof BarChart3;
}[] = [
  {
    id: "analytical",
    label: "Analytical",
    description: "Data-driven, implications-focused",
    icon: BarChart3,
  },
  {
    id: "concise",
    label: "Concise",
    description: "Essential facts, minimal prose",
    icon: FileText,
  },
  {
    id: "narrative",
    label: "Narrative",
    description: "Editorial flow with context",
    icon: Newspaper,
  },
];

interface ToneStepProps {
  userId: string;
  flow: PersonalizeFlow;
}

export function ToneStep({ userId, flow }: ToneStepProps) {
  const routes = getPersonalizeRoutes(flow);
  const { advance, saving, error } = useAdvanceOnboarding();
  const profile = getOnboardingProfile(userId);
  const [selected, setSelected] = useState<Tone | null>(profile.tone);

  const finish = () => {
    if (!selected) return;
    void advance({
      userId,
      partial: {
        tone: selected,
        completed: flow === "settings" ? true : undefined,
      },
      nextPath: routes.complete,
      reloadClerkOnFinish: true,
    });
  };

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-1">
        {toneOptions.map((opt) => (
          <OnboardingCard
            key={opt.id}
            id={opt.id}
            label={opt.label}
            description={opt.description}
            icon={opt.icon}
            selected={selected === opt.id}
            onSelect={() => setSelected(opt.id)}
          />
        ))}
      </div>
      {error && (
        <p className="text-center text-sm text-red-400">{error}</p>
      )}
      <Button
        className="w-full rounded-full bg-white text-zinc-950 hover:bg-zinc-200"
        disabled={!selected || saving}
        onClick={finish}
      >
        {saving
          ? "Saving…"
          : flow === "settings"
            ? "Save and return to briefing"
            : "Enter your briefing"}
      </Button>
    </>
  );
}
