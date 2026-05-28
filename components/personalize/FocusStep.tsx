"use client";

import { useState } from "react";
import { Layers, Zap, BookOpen } from "lucide-react";
import { OnboardingCard } from "@/components/OnboardingCard";
import { Button } from "@/components/ui/button";
import { useAdvanceOnboarding } from "@/components/personalize/useAdvanceOnboarding";
import { getOnboardingProfile } from "@/lib/onboarding";
import { getPersonalizeRoutes, type PersonalizeFlow } from "@/lib/personalize/routes";
import type { FocusType } from "@/lib/types";

const focusOptions: {
  id: FocusType;
  label: string;
  description: string;
  icon: typeof Layers;
}[] = [
  {
    id: "breadth",
    label: "Broad awareness",
    description: "Wide coverage across your interest areas",
    icon: Layers,
  },
  {
    id: "depth",
    label: "Deep analysis",
    description: "Longer reads with strategic context",
    icon: BookOpen,
  },
  {
    id: "breaking",
    label: "Breaking signal",
    description: "Critical developments as they emerge",
    icon: Zap,
  },
];

interface FocusStepProps {
  userId: string;
  flow: PersonalizeFlow;
}

export function FocusStep({ userId, flow }: FocusStepProps) {
  const routes = getPersonalizeRoutes(flow);
  const { advance, saving, error } = useAdvanceOnboarding();
  const [selected, setSelected] = useState<FocusType | null>(
    () => getOnboardingProfile(userId).focusType
  );

  const continue_ = () => {
    if (!selected) return;
    void advance({
      userId,
      partial: { focusType: selected },
      nextPath: routes.tone,
    });
  };

  return (
    <>
      <div className="space-y-3">
        {focusOptions.map((opt) => (
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
        onClick={continue_}
      >
        {saving ? "Saving…" : "Continue"}
      </Button>
    </>
  );
}
