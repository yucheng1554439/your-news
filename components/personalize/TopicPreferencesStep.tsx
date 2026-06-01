"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getOnboardingProfile, hydrateOnboardingProfile } from "@/lib/onboarding";
import { persistTopicPreferencesStep } from "@/lib/onboarding/advance-step";
import { getTopicPreferencesAction } from "@/app/actions/user-profile";
import {
  TOPIC_PREFERENCE_OPTIONS,
  type TopicPreferenceId,
} from "@/lib/personalization/topic-options";
import {
  normalizeTopicPreferences,
  type TopicPreferences,
} from "@/lib/personalization/topic-preferences";
import {
  validateTopicPreferences,
  topicPreferencesPayloadStats,
} from "@/lib/personalization/validate-topic-preferences";

type TopicBucket = "moreOf" | "lessOf" | "neverShow";

interface TopicPreferencesStepProps {
  userId: string;
  onSaved?: () => void;
}

function bucketForTopic(
  prefs: TopicPreferences,
  topicId: TopicPreferenceId
): TopicBucket | null {
  if (prefs.neverShow.includes(topicId)) return "neverShow";
  if (prefs.lessOf.includes(topicId)) return "lessOf";
  if (prefs.moreOf.includes(topicId)) return "moreOf";
  return null;
}

function setTopicBucket(
  prefs: TopicPreferences,
  topicId: TopicPreferenceId,
  bucket: TopicBucket | null
): TopicPreferences {
  const next: TopicPreferences = {
    moreOf: prefs.moreOf.filter((id) => id !== topicId),
    lessOf: prefs.lessOf.filter((id) => id !== topicId),
    neverShow: prefs.neverShow.filter((id) => id !== topicId),
  };
  if (bucket === "moreOf") next.moreOf.push(topicId);
  if (bucket === "lessOf") next.lessOf.push(topicId);
  if (bucket === "neverShow") next.neverShow.push(topicId);
  return normalizeTopicPreferences(next);
}

const SECTIONS: {
  bucket: TopicBucket;
  title: string;
  description: string;
  accent: string;
}[] = [
  {
    bucket: "moreOf",
    title: "Topics I Want More Of",
    description: "Boost these in Relevant To You, Top Stories, and More Stories.",
    accent: "border-emerald-500/30 bg-emerald-950/20",
  },
  {
    bucket: "lessOf",
    title: "Topics I Want Less Of",
    description: "Soft penalty — still visible when strategically important.",
    accent: "border-amber-500/30 bg-amber-950/20",
  },
  {
    bucket: "neverShow",
    title: "Never Show Me",
    description:
      "Hard exclusion unless a story clears a high strategic override bar.",
    accent: "border-red-500/30 bg-red-950/20",
  },
];

export function TopicPreferencesStep({
  userId,
  onSaved,
}: TopicPreferencesStepProps) {
  const [prefs, setPrefs] = useState<TopicPreferences>(() =>
    normalizeTopicPreferences(getOnboardingProfile(userId).topicPreferences)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getTopicPreferencesAction().then((remote) => {
      if (cancelled) return;
      if (remote) {
        const normalized = normalizeTopicPreferences(remote);
        setPrefs(normalized);
        hydrateOnboardingProfile(
          { ...getOnboardingProfile(userId), topicPreferences: normalized },
          userId
        );
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const validationPreview = validateTopicPreferences(prefs);

  const cycleTopic = (topicId: TopicPreferenceId) => {
    setSaved(false);
    setPrefs((current) => {
      const active = bucketForTopic(current, topicId);
      const order: (TopicBucket | null)[] = [
        null,
        "moreOf",
        "lessOf",
        "neverShow",
      ];
      const nextIndex = (order.indexOf(active) + 1) % order.length;
      return setTopicBucket(current, topicId, order[nextIndex]);
    });
  };

  const save = async () => {
    const normalized = normalizeTopicPreferences(prefs);
    const validation = validateTopicPreferences(normalized);
    if (!validation.ok) {
      setError(validation.message);
      console.warn(
        "[ONBOARDING_SAVE] ui_validation_rejected",
        JSON.stringify({
          code: validation.code,
          ...topicPreferencesPayloadStats(normalized),
        })
      );
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);

    const stats = topicPreferencesPayloadStats(validation.normalized);
    console.log(
      "[ONBOARDING_SAVE] ui_save_click",
      JSON.stringify({
        moreCount: stats.moreCount,
        lessCount: stats.lessCount,
        neverCount: stats.neverCount,
        payloadSize: stats.payloadSize,
      })
    );

    const result = await persistTopicPreferencesStep(
      userId,
      validation.normalized
    );
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPrefs(validation.normalized);
    setSaved(true);
    onSaved?.();
  };

  return (
    <div className="space-y-8">
      {loading && (
        <p className="text-center text-sm text-zinc-500">
          Loading topic preferences…
        </p>
      )}
      {SECTIONS.map((section) => (
        <div key={section.bucket} className="space-y-3">
          <div>
            <h2 className="text-sm font-medium text-white">{section.title}</h2>
            <p className="mt-1 text-xs text-zinc-500">{section.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {TOPIC_PREFERENCE_OPTIONS.map((option) => {
              const active = bucketForTopic(prefs, option.id) === section.bucket;
              const Icon = option.icon;
              return (
                <button
                  key={`${section.bucket}-${option.id}`}
                  type="button"
                  onClick={() => {
                    setSaved(false);
                    setPrefs((current) => {
                      const isActive =
                        bucketForTopic(current, option.id) === section.bucket;
                      return setTopicBucket(
                        current,
                        option.id,
                        isActive ? null : section.bucket
                      );
                    });
                  }}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                    active
                      ? section.accent + " text-white"
                      : "border-white/10 bg-zinc-900/50 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-4">
        <p className="text-xs text-zinc-500">
          Tap a topic chip under each section, or click any topic below to
          cycle: neutral → more → less → never.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {TOPIC_PREFERENCE_OPTIONS.map((option) => {
            const active = bucketForTopic(prefs, option.id);
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => cycleTopic(option.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                  active === "moreOf" &&
                    "border-emerald-500/40 bg-emerald-950/30 text-emerald-100",
                  active === "lessOf" &&
                    "border-amber-500/40 bg-amber-950/30 text-amber-100",
                  active === "neverShow" &&
                    "border-red-500/40 bg-red-950/30 text-red-100",
                  !active &&
                    "border-white/10 bg-zinc-900/50 text-zinc-400 hover:border-white/20"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {validationPreview.ok === false && (
        <p className="text-center text-sm text-amber-400">
          {validationPreview.message}
        </p>
      )}

      {error && <p className="text-center text-sm text-red-400">{error}</p>}
      {saved && (
        <p className="text-center text-sm text-emerald-400">
          Topic preferences saved.
        </p>
      )}

      <Button
        className="w-full rounded-full bg-white text-zinc-950 hover:bg-zinc-200"
        disabled={saving || !validationPreview.ok}
        onClick={() => void save()}
      >
        {saving ? "Saving…" : "Save topic preferences"}
      </Button>
    </div>
  );
}
