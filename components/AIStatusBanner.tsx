"use client";

import type { IntelligenceGeneratedBy } from "@/lib/intelligence/types";

type AIStatusBannerProps = {
  generatedBy?: IntelligenceGeneratedBy;
  aiError?: string;
  /** @deprecated Use aiError */
  openaiError?: string;
  context: "weekly" | "story";
};

function isModelGenerated(
  generatedBy?: IntelligenceGeneratedBy
): generatedBy is "anthropic" | "openai" {
  return generatedBy === "anthropic" || generatedBy === "openai";
}

export function AIStatusBanner({
  generatedBy,
  aiError,
  openaiError,
  context,
}: AIStatusBannerProps) {
  if (isModelGenerated(generatedBy)) return null;

  const err = aiError ?? openaiError;
  const label =
    context === "weekly"
      ? "Fallback active — weekly briefing"
      : "Fallback active — story intelligence";

  return (
    <div
      role="status"
      className="rounded-lg border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-sm text-amber-100/90"
    >
      <p className="font-medium text-amber-50">{label}</p>
      <p className="mt-1 text-amber-100/80">
        Claude did not produce this content. Template text is shown instead.
        {err ? ` ${err}` : " Check server logs for [ANTHROPIC] or [OPENAI] lines."}
      </p>
    </div>
  );
}

/** @deprecated Use AIStatusBanner */
export const OpenAIStatusBanner = AIStatusBanner;
