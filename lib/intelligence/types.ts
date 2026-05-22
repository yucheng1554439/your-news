import type { OnboardingProfile } from "@/lib/types";

/** Independently generated editorial sections — each with a distinct purpose. */
export interface StoryIntelligencePackage {
  theBriefing: string;
  whyItMatters: string;
  whyItMattersToYou?: string;
  strategicImplications?: string;
  perspectives?: string;
  marketRead?: string;
  sourceLens?: string;
  generatedAt: string;
  profileFingerprint: string;
}

export interface IntelligenceContext {
  profile: OnboardingProfile | null;
  userId?: string | null;
}
