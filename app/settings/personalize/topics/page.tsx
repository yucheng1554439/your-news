"use client";

import Link from "next/link";
import { TopicPreferencesStep } from "@/components/personalize/TopicPreferencesStep";
import { useOnboardingSync } from "@/hooks/use-onboarding-sync";

export default function SettingsPersonalizeTopicsPage() {
  const { synced, userId } = useOnboardingSync();

  if (!synced || !userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-6 w-6 animate-pulse rounded-full border border-white/20 border-t-white" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-900/50 via-zinc-950 to-zinc-950"
          aria-hidden
        />

        <div className="relative w-full max-w-2xl space-y-8">
          <div className="space-y-2 text-center">
            <Link
              href="/settings"
              className="font-serif text-lg text-white/80 transition-opacity hover:opacity-100"
            >
              Your News
            </Link>
            <h1 className="font-serif text-2xl text-white sm:text-3xl">
              Topic preferences
            </h1>
            <p className="text-sm text-zinc-400">
              You control what enters your feed. Explicit choices override
              inferred behavior.
            </p>
          </div>

          <TopicPreferencesStep userId={userId} />

          <div className="text-center">
            <Link
              href="/settings"
              className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Back to settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
