"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  completeOnboardingAsync,
  getOnboardingProfile,
} from "@/lib/onboarding";
import { useOnboardingSync } from "@/hooks/use-onboarding-sync";
import type { FocusType, Tone } from "@/lib/types";

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

function PreferencesForm({ userId }: { userId: string }) {
  const router = useRouter();
  const { user } = useUser();
  const profile = getOnboardingProfile(userId);
  const [focus, setFocus] = useState<FocusType | null>(profile.focusType);
  const [tone, setToneState] = useState<Tone | null>(profile.tone);
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    if (!focus || !tone) return;
    setSaving(true);
    await completeOnboardingAsync(userId, {
      focusType: focus,
      tone,
    });
    await user?.reload();
    router.push("/");
    router.refresh();
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
                onSelect={() => setToneState(opt.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <Button
        className="w-full rounded-full bg-white text-zinc-950 hover:bg-zinc-200"
        disabled={!focus || !tone || saving}
        onClick={() => void finish()}
      >
        {saving ? "Saving…" : "Enter your briefing"}
      </Button>
    </>
  );
}

export default function PreferencesPage() {
  const { synced, userId } = useOnboardingSync();

  if (!synced || !userId) {
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
      <PreferencesForm key={userId} userId={userId} />
    </OnboardingLayout>
  );
}
