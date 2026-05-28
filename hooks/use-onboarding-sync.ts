"use client";

import { startTransition, useEffect, useRef, useState } from "react";
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
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user?.id) {
      lastUserIdRef.current = null;
      startTransition(() => {
        setSynced(true);
        setProfile(null);
      });
      return;
    }

    const userId = user.id;
    let cancelled = false;

    async function sync() {
      const clerkMeta = parseOnboardingFromMetadata(
        user!.publicMetadata as Record<string, unknown>
      );
      const local = stampProfile(getOnboardingProfile(userId));

      let resolved = reconcileOnboardingProfiles(local, clerkMeta);

      if (!local.completed && !clerkMeta?.completed) {
        const remote = await getOnboardingFromClerk();
        if (remote) {
          resolved = reconcileOnboardingProfiles(local, remote);
        }
      }

      if (!resolved.completed && local.interests.length > 0) {
        const localTs = local.updatedAt ?? 0;
        const resolvedTs = resolved.updatedAt ?? 0;
        if (localTs >= resolvedTs) {
          resolved = local;
        }
      }

      hydrateOnboardingProfile(resolved, userId);

      const clerkTs = clerkMeta?.updatedAt ?? 0;
      if ((resolved.updatedAt ?? 0) > clerkTs) {
        await saveOnboardingToClerk(resolved);
      }

      if (!cancelled) {
        startTransition(() => {
          setProfile(resolved);
          setSynced(true);
        });
        lastUserIdRef.current = userId;
      }
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, user?.id]);

  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    const userId = user.id;

    const onFocus = () => {
      const local = stampProfile(getOnboardingProfile(userId));
      setProfile((prev) => {
        const prevKey = prev?.updatedAt ?? 0;
        const nextKey = local.updatedAt ?? 0;
        if (prevKey === nextKey && prev?.career === local.career) return prev;
        return reconcileOnboardingProfiles(local, prev);
      });
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isLoaded, user?.id]);

  return {
    user,
    isLoaded,
    synced,
    profile,
    userId: user?.id ?? null,
    isOnboardingComplete: profile?.completed ?? false,
  };
}
