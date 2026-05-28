"use server";

import { getEnrichedStoryFromSnapshot } from "@/lib/intelligence/platform-snapshot";
import { getStoryBySlug } from "@/lib/data/stories";
import type { OnboardingProfile, Story } from "@/lib/types";

/**
 * Read-only — never triggers Claude on page load.
 * AI runs only via Refresh Intelligence on the dashboard.
 */
export async function fetchStoryIntelligence(
  slug: string,
  profile: OnboardingProfile | null
): Promise<Story | null> {
  const fromSnapshot = await getEnrichedStoryFromSnapshot(slug);
  if (fromSnapshot) return fromSnapshot;

  return (await getStoryBySlug(slug, { profile, enrich: false })) ?? null;
}
