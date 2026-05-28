"use server";

import { revalidatePath } from "next/cache";
import { getOnboardingFromClerk } from "@/app/actions/onboarding";
import { refreshPlatformIntelligence } from "@/lib/intelligence/platform-snapshot";

export async function refreshIntelligenceAction(): Promise<{
  ok: boolean;
  updatedAt: number;
  error?: string;
}> {
  const profile = await getOnboardingFromClerk();
  const result = await refreshPlatformIntelligence(profile);

  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/story/[slug]", "page");
  }

  return {
    ok: result.ok,
    updatedAt: result.updatedAt,
    error: result.error,
  };
}
