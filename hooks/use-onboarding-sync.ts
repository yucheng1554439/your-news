"use client";

import { startTransition, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { getOnboardingFromClerk, saveOnboardingToClerk } from "@/app/actions/onboarding";
import {
  getOnboardingProfile,
  hydrateOnboardingProfile,
} from "@/lib/onboarding";
import { parseOnboardingFromMetadata } from "@/lib/onboarding-metadata";
import {
  reconcileOnboardingProfiles,
  stampProfile,
} from "@/lib/profile/reconcile";
import type { OnboardingProfile } from "@/lib/types";

export function useOnboardingSync() {
  const { user, isLoaded } = useUser();
  const [synced, setSynced] = useState(false);
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      startTransition(() => {
        setSynced(true);
        setProfile(null);
      });
      return;
    }

    let cancelled = false;

    async function sync() {
      if (!user) return;

      const clerkMeta = parseOnboardingFromMetadata(
        user.publicMetadata as Record<string, unknown>
      );
      const local = stampProfile(getOnboardingProfile(user.id));

      let resolved = reconcileOnboardingProfiles(local, clerkMeta);

      if (!clerkMeta?.completed && !local.completed) {
        const remote = await getOnboardingFromClerk();
        if (remote) {
          resolved = reconcileOnboardingProfiles(local, remote);
        }
      }

      const localTs = local.updatedAt ?? 0;
      const resolvedTs = resolved.updatedAt ?? 0;
      if (localTs > resolvedTs && local.interests.length > 0) {
        resolved = local;
      }

      hydrateOnboardingProfile(resolved, user.id);

      const clerkTs = clerkMeta?.updatedAt ?? 0;
      if ((resolved.updatedAt ?? 0) > clerkTs) {
        await saveOnboardingToClerk(resolved);
      }

      if (!cancelled) {
        startTransition(() => {
          setProfile(resolved);
          setSynced(true);
        });
      }
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, user]);

  return {
    user,
    isLoaded,
    synced,
    profile,
    userId: user?.id ?? null,
    isOnboardingComplete: profile?.completed ?? false,
  };
}
