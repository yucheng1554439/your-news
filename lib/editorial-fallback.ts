import { buildFallbackIntelligence } from "@/lib/intelligence/fallback";
import { hashProfile } from "@/lib/intelligence/profile-context";
import type { StoryIntelligencePackage } from "@/lib/intelligence/types";
import type { Story } from "@/lib/types";

/** Human-readable intelligence when OpenAI is unavailable. */
export function buildEditorialFallback(story: Story): StoryIntelligencePackage {
  return buildFallbackIntelligence(story, null, hashProfile(null));
}
