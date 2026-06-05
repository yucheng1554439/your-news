"use client";

import type { IntelligenceGeneratedBy } from "@/lib/intelligence/types";

type AIStatusBannerProps = {
  generatedBy?: IntelligenceGeneratedBy;
  aiError?: string;
  /** @deprecated Use aiError */
  openaiError?: string;
  context: "weekly" | "story";
};

/** Hidden from users — fallback/metadata paths log server-side only. */
export function AIStatusBanner(_props: AIStatusBannerProps) {
  return null;
}

/** @deprecated Use AIStatusBanner */
export const OpenAIStatusBanner = AIStatusBanner;
