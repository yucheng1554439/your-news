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
  context,
}: AIStatusBannerProps) {
  if (isModelGenerated(generatedBy)) return null;

  if (generatedBy === "metadata" && context === "story") {
    return (
      <div
        role="status"
        className="rounded-lg border border-amber-500/25 bg-amber-950/20 px-4 py-3 text-sm text-amber-100/90"
      >
        <p className="font-medium text-amber-50">Signal summary</p>
        <p className="mt-1 text-amber-100/80">
          Built from headline, description, and corroborating coverage — not the
          paywalled article body.
        </p>
      </div>
    );
  }

  const label =
    context === "weekly"
      ? "Editorial briefing"
      : "Editorial analysis";

  return (
    <div
      role="status"
      className="rounded-lg border border-white/10 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-300"
    >
      <p className="font-medium text-zinc-200">{label}</p>
      <p className="mt-1 text-zinc-400">
        Structured from source reporting. Refresh intelligence on the homepage
        for a live AI synthesis when available.
      </p>
    </div>
  );
}

/** @deprecated Use AIStatusBanner */
export const OpenAIStatusBanner = AIStatusBanner;
