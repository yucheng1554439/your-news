"use client";

import { useEffect, useState } from "react";
import { getUserIntelligenceProfileAction } from "@/app/actions/user-intelligence";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";

export function UserIntelligenceCard() {
  const [profile, setProfile] = useState<UserIntelligenceProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getUserIntelligenceProfileAction().then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6 text-sm text-zinc-500">
        Loading your intelligence profile…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6 text-sm text-zinc-400">
        Complete onboarding and read a few stories — we will learn what matters
        to you beyond generic career labels.
      </div>
    );
  }

  const conf = Math.round(profile.behaviorConfidence * 100);
  const primaryThemes = profile.primaryThemes ?? profile.topThemes;
  const secondaryThemes = profile.secondaryThemes ?? [];
  const primaryEntities = profile.primaryEntities ?? profile.topEntities;

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6 space-y-4">
      <div>
        <h2 className="font-serif text-lg text-white">Your Intelligence Profile</h2>
        <p className="mt-1 text-sm text-zinc-400">{profile.effectiveLens}</p>
        <p className="mt-2 text-xs text-zinc-500">
          Career and interests are your stable identity. Behavior confidence{" "}
          {conf}% — recent reading adjusts ranking but does not replace who you
          are or override your topic preferences.
        </p>
      </div>

      {primaryThemes.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Primary themes
          </h3>
          <p className="mt-1 text-sm text-zinc-200">
            {primaryThemes.map((t) => t.label).join(" · ")}
          </p>
        </div>
      )}

      {secondaryThemes.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Secondary themes
          </h3>
          <p className="mt-1 text-sm text-zinc-300">
            {secondaryThemes.map((t) => t.label).join(" · ")}
          </p>
        </div>
      )}

      {primaryEntities.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Recurring focus
          </h3>
          <p className="mt-1 text-sm text-zinc-200">
            {primaryEntities.map((e) => e.label).join(" · ")}
          </p>
        </div>
      )}

      {(profile.topicPreferencesMore?.length ?? 0) > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Topics I want more of
          </h3>
          <p className="mt-1 text-sm text-emerald-200/90">
            {profile.topicPreferencesMore!.join(" · ")}
          </p>
        </div>
      )}

      {(profile.topicPreferencesLess?.length ?? 0) > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Topics I want less of
          </h3>
          <p className="mt-1 text-sm text-amber-200/90">
            {profile.topicPreferencesLess!.join(" · ")}
          </p>
        </div>
      )}

      {(profile.topicPreferencesNever?.length ?? 0) > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Never show me
          </h3>
          <p className="mt-1 text-sm text-red-200/90">
            {profile.topicPreferencesNever!.join(" · ")}
          </p>
        </div>
      )}

      {(profile.ignoredThemes.length > 0 ||
        profile.ignoredCategories.length > 0) && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Inferred from behavior
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            {[...profile.ignoredThemes, ...profile.ignoredCategories].join(" · ")}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Soft signal only — your explicit topic settings above take priority.
          </p>
        </div>
      )}

      {profile.emergingInterests.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Emerging
          </h3>
          <p className="mt-1 text-sm text-zinc-300">
            {profile.emergingInterests.join(" · ")}
          </p>
        </div>
      )}
    </div>
  );
}
