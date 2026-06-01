import type { AIProviderId } from "@/lib/intelligence/provider/types";
import type { OnboardingProfile } from "@/lib/types";

export type IntelligenceGeneratedBy = AIProviderId | "fallback" | "metadata";

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
  /** Story slug this package was generated for. */
  anchorSlug?: string;
  anchorHeadline?: string;
  materialSlugs?: string[];
  clusterId?: string;
  usedClusterMaterial?: boolean;
  /** Last provider error when fallback was used. */
  aiError?: string;
  /** @deprecated Use aiError */
  openaiError?: string;
  /** Paywall path — summary built from metadata + corroboration, not article body. */
  paywallSignal?: boolean;
  signalSummaryDisclaimer?: string;
}

export interface IntelligenceContext {
  profile: OnboardingProfile | null;
  userId?: string | null;
}
