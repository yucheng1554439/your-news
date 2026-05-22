"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Brain,
  LineChart,
  Zap,
  Globe,
  Shield,
  Rocket,
  Scale,
  Code,
} from "lucide-react";
import { OnboardingCard } from "@/components/OnboardingCard";
import { Button } from "@/components/ui/button";
import { getOnboardingProfile, setInterestsAsync } from "@/lib/onboarding";
import { getPersonalizeRoutes, type PersonalizeFlow } from "@/lib/personalize/routes";

const interestOptions = [
  { id: "ai", label: "AI & Machine Learning", icon: Brain },
  { id: "markets", label: "Markets & Finance", icon: LineChart },
  { id: "energy", label: "Energy & Climate", icon: Zap },
  { id: "geopolitics", label: "Geopolitics", icon: Globe },
  { id: "cybersecurity", label: "Cybersecurity", icon: Shield },
  { id: "startups", label: "Startups & Venture", icon: Rocket },
  { id: "policy", label: "Policy & Regulation", icon: Scale },
  { id: "developer", label: "Developer Tools", icon: Code },
];

interface InterestsStepProps {
  userId: string;
  flow: PersonalizeFlow;
}

export function InterestsStep({ userId, flow }: InterestsStepProps) {
  const router = useRouter();
  const { user } = useUser();
  const routes = getPersonalizeRoutes(flow);
  const [selected, setSelected] = useState(
    () => getOnboardingProfile(userId).interests
  );
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const continue_ = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    await setInterestsAsync(selected, userId);
    await user?.reload();
    setSaving(false);
    router.push(routes.career);
    router.refresh();
  };

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {interestOptions.map((opt) => (
          <OnboardingCard
            key={opt.id}
            id={opt.id}
            label={opt.label}
            icon={opt.icon}
            selected={selected.includes(opt.id)}
            onSelect={() => toggle(opt.id)}
          />
        ))}
      </div>
      <Button
        className="w-full rounded-full bg-white text-zinc-950 hover:bg-zinc-200"
        disabled={selected.length === 0 || saving}
        onClick={() => void continue_()}
      >
        {saving ? "Saving…" : "Continue"}
      </Button>
    </>
  );
}
