"use client";

import { useState } from "react";
import {
  Code2,
  TrendingUp,
  Lightbulb,
  Briefcase,
  FlaskConical,
} from "lucide-react";
import { OnboardingCard } from "@/components/OnboardingCard";
import { Button } from "@/components/ui/button";
import { useAdvanceOnboarding } from "@/components/personalize/useAdvanceOnboarding";
import { getOnboardingProfile } from "@/lib/onboarding";
import { getPersonalizeRoutes, type PersonalizeFlow } from "@/lib/personalize/routes";
import type { Career } from "@/lib/types";

const careerOptions: {
  id: Career;
  label: string;
  description: string;
  icon: typeof Code2;
}[] = [
  {
    id: "engineer",
    label: "Software Engineer",
    description: "AI, infrastructure, and developer ecosystems",
    icon: Code2,
  },
  {
    id: "investor",
    label: "Investor",
    description: "Markets, energy, and macro strategy",
    icon: TrendingUp,
  },
  {
    id: "founder",
    label: "Founder",
    description: "Startups, regulation, and competitive landscape",
    icon: Lightbulb,
  },
  {
    id: "executive",
    label: "Executive",
    description: "Policy, geopolitics, and enterprise strategy",
    icon: Briefcase,
  },
  {
    id: "researcher",
    label: "Researcher",
    description: "Frontier technology and policy intersections",
    icon: FlaskConical,
  },
];

interface CareerStepProps {
  userId: string;
  flow: PersonalizeFlow;
}

export function CareerStep({ userId, flow }: CareerStepProps) {
  const routes = getPersonalizeRoutes(flow);
  const { advance, saving, error } = useAdvanceOnboarding();
  const [selected, setSelected] = useState<Career | null>(
    () => getOnboardingProfile(userId).career
  );

  const continue_ = () => {
    if (!selected) return;
    void advance({
      userId,
      partial: { career: selected },
      nextPath: routes.focus,
    });
  };

  return (
    <>
      <div className="space-y-3">
        {careerOptions.map((opt) => (
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
