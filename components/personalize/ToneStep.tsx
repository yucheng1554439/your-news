"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { BarChart3, FileText, Newspaper } from "lucide-react";
import { OnboardingCard } from "@/components/OnboardingCard";
import { Button } from "@/components/ui/button";
import {
  completeOnboardingAsync,
  getOnboardingProfile,
  saveOnboardingProfileAsync,
} from "@/lib/onboarding";
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
  const router = useRouter();
  const { user } = useUser();
  const routes = getPersonalizeRoutes(flow);
  const profile = getOnboardingProfile(userId);
  const [selected, setSelected] = useState<Tone | null>(profile.tone);
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    if (!selected) return;
    setSaving(true);

    if (flow === "settings") {
      await saveOnboardingProfileAsync(
        { tone: selected, completed: true },
        userId
      );
    } else {
      await completeOnboardingAsync(userId, { tone: selected });
    }

    await user?.reload();
    setSaving(false);
    router.push(routes.complete);
    router.refresh();
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
      <Button
        className="w-full rounded-full bg-white text-zinc-950 hover:bg-zinc-200"
        disabled={!selected || saving}
        onClick={() => void finish()}
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
