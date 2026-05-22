"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Layers, Zap, BookOpen } from "lucide-react";
import { OnboardingCard } from "@/components/OnboardingCard";
import { Button } from "@/components/ui/button";
import {
  getOnboardingProfile,
  saveOnboardingProfileAsync,
} from "@/lib/onboarding";
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
  const router = useRouter();
  const { user } = useUser();
  const routes = getPersonalizeRoutes(flow);
  const [selected, setSelected] = useState<FocusType | null>(
    () => getOnboardingProfile(userId).focusType
  );
  const [saving, setSaving] = useState(false);

  const continue_ = async () => {
    if (!selected) return;
    setSaving(true);
    await saveOnboardingProfileAsync({ focusType: selected }, userId);
    await user?.reload();
    setSaving(false);
    router.push(routes.tone);
    router.refresh();
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
