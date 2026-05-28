import type { AIProviderId } from "@/lib/intelligence/provider/types";
import type { OnboardingProfile } from "@/lib/types";

export type IntelligenceGeneratedBy = AIProviderId | "fallback";

/** Independently generated editorial sections — each with a distinct purpose. */
export interface StoryIntelligencePackage {
  theBriefing: string;
  whyItMatters: string;
  whyItMattersToYou?: string;
  nextWatch?: string;
  strategicImplications?: string;
  perspectives?: string;
  marketRead?: string;
  sourceLens?: string;
  generatedAt: string;
  profileFingerprint: string;
  generatedBy: IntelligenceGeneratedBy;
  /** Last provider error when fallback was used. */
  aiError?: string;
  /** @deprecated Use aiError */
  openaiError?: string;
}

export interface IntelligenceContext {
  profile: OnboardingProfile | null;
  userId?: string | null;
}
