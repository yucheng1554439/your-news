"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { persistOnboardingStep } from "@/lib/onboarding/advance-step";
import type { OnboardingProfile } from "@/lib/types";

type AdvanceOptions = {
  userId: string;
  partial: Partial<OnboardingProfile>;
  nextPath: string;
  /** Reload Clerk user once at end of onboarding (not between steps). */
  reloadClerkOnFinish?: boolean;
};

export function useAdvanceOnboarding() {
  const router = useRouter();
  const { user } = useUser();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const advancingRef = useRef(false);

  const advance = useCallback(
    async (options: AdvanceOptions) => {
      if (advancingRef.current) return false;
      advancingRef.current = true;
      setSaving(true);
      setError(null);

      let succeeded = false;
      try {
        const result = await persistOnboardingStep(
          options.userId,
          options.partial
        );

        if (!result.ok) {
          setError(result.error);
          return false;
        }

        if (options.reloadClerkOnFinish) {
          await user?.reload();
        }

        succeeded = true;
        router.replace(options.nextPath);
        return true;
      } finally {
        if (!succeeded) {
          setSaving(false);
          advancingRef.current = false;
        }
      }
    },
    [router, user]
  );

  return { advance, saving, error };
}
