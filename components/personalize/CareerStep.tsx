"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Code2,
  TrendingUp,
  Lightbulb,
  Briefcase,
  FlaskConical,
} from "lucide-react";
import { OnboardingCard } from "@/components/OnboardingCard";
import { Button } from "@/components/ui/button";
import { getOnboardingProfile, setCareerAsync } from "@/lib/onboarding";
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
  const router = useRouter();
  const { user } = useUser();
  const routes = getPersonalizeRoutes(flow);
  const [selected, setSelected] = useState<Career | null>(
    () => getOnboardingProfile(userId).career
  );
  const [saving, setSaving] = useState(false);

  const continue_ = async () => {
    if (!selected) return;
    setSaving(true);
    await setCareerAsync(selected, userId);
    await user?.reload();
    setSaving(false);
    router.push(routes.focus);
    router.refresh();
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
      <Button
        className="w-full rounded-full bg-white text-zinc-950 hover:bg-zinc-200"
        disabled={!selected || saving}
        onClick={() => void continue_()}
      >
        {saving ? "Saving…" : "Continue"}
      </Button>
    </>
  );
}
