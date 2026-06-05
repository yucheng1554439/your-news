import "server-only";

import {
  briefingMeetsCorpusThreshold,
  extractBriefingProvenanceStats,
} from "@/lib/briefing/briefing-provenance-guard";
import { BRIEFING_CORPUS_MIN } from "@/lib/briefing/briefing-corpus";
import {
  briefingMatchesCadence,
  normalizeBriefing,
} from "@/lib/briefing/shared/normalize";
import { briefingIsUserSafe } from "@/lib/briefing/weekly-rescue";
import { briefingContainsRefusal } from "@/lib/intelligence/model-refusal";
import type {
  BriefingCadence,
  BriefingMode,
  IntelligenceBriefing,
} from "@/lib/briefing/types";

/** Final source of the briefing shown to the user. */
export type BriefingGenerationOutcome =
  | "LLM_GENERATED"
  | "EDITORIAL_FALLBACK"
  | "SNAPSHOT_CACHED"
  | "PREVIOUS_FALLBACK";

export type BriefingFallbackReason =
  | "ai_not_configured"
  | "context_limit"
  | "model_error"
  | "parse_failure"
  | "validation_failure"
  | "duplicate_title_rejection"
  | "provenance_mismatch"
  | "cluster_mismatch"
  | "corpus_threshold"
  | "model_refusal"
  | "insufficient_material"
  | "prompt_build_failed"
  | "user_unsafe"
  | "cadence_mismatch"
  | "unknown";

/** Daily and weekly share one pipeline — only corpus window and rules differ. */
export const BRIEFING_EXECUTION_PATH = {
  generation: "lib/briefing/weekly-engine.ts → buildAIBriefing / buildSyncBriefing",
  prompt: "lib/briefing/prompts.ts → buildWeeklyBriefingPrompt",
  parser: "lib/intelligence/parse-tagged-weekly.ts → parseWeeklyBriefingResponse",
  verifier:
    "lib/briefing/briefing-generation-audit.ts → verifyBriefingOutput + briefingIsUserSafe",
} as const;

export type BriefingParsedSections = {
  overview: boolean;
  overviewChars: number;
  impact: boolean;
  impactChars: number;
  watch: boolean;
  watchChars: number;
  action: boolean;
  actionChars: number;
  headline: string;
};

export type PreLlmMetrics = {
  cadence: BriefingCadence;
  mode: BriefingMode;
  promptLength: number;
  systemPromptLength: number;
  clusterCount: number;
  storyCount: number;
  sourceCount: number;
  corpusPoolSize: number;
  clusterIds: string[];
};

function auditPayload(extra: Record<string, unknown>): string {
  return JSON.stringify(extra);
}

export function logBriefingGenerationStart(
  cadence: BriefingCadence,
  mode: BriefingMode,
  force: boolean
): void {
  console.log(
    "[WEEKLY_GENERATION_START]",
    auditPayload({
      cadence,
      mode,
      force,
      path: BRIEFING_EXECUTION_PATH,
    })
  );
}

export function logPreLlmMetrics(metrics: PreLlmMetrics): void {
  console.log(
    "[BRIEFING_PRE_LLM]",
    auditPayload({
      cadence: metrics.cadence,
      mode: metrics.mode,
      weeklyPromptLength: metrics.promptLength,
      weeklySystemPromptLength: metrics.systemPromptLength,
      weeklyClusterCount: metrics.clusterCount,
      weeklyStoryCount: metrics.storyCount,
      weeklySourceCount: metrics.sourceCount,
      corpusPoolSize: metrics.corpusPoolSize,
      clusterIds: metrics.clusterIds.slice(0, 12),
    })
  );
}

export function logBriefingLlmSuccess(
  cadence: BriefingCadence,
  mode: BriefingMode,
  extra?: Record<string, unknown>
): void {
  console.log(
    "[WEEKLY_LLM_SUCCESS]",
    auditPayload({ cadence, mode, ...extra })
  );
}

export function logBriefingParseSuccess(
  cadence: BriefingCadence,
  mode: BriefingMode,
  sections: BriefingParsedSections,
  extra?: Record<string, unknown>
): void {
  console.log(
    "[WEEKLY_PARSE_SUCCESS]",
    auditPayload({
      cadence,
      mode,
      generatedSections: {
        overview: sections.overview,
        overviewChars: sections.overviewChars,
        impact: sections.impact,
        impactChars: sections.impactChars,
        watch: sections.watch,
        watchChars: sections.watchChars,
        action: sections.action,
        actionChars: sections.actionChars,
      },
      headline: sections.headline.slice(0, 120),
      ...extra,
    })
  );
}

export function logBriefingVerifySuccess(
  cadence: BriefingCadence,
  mode: BriefingMode,
  briefing: IntelligenceBriefing,
  synthesisStoryCount: number
): void {
  const stats = extractBriefingProvenanceStats(briefing);
  console.log(
    "[WEEKLY_VERIFY_SUCCESS]",
    auditPayload({
      cadence,
      mode,
      synthesisStoryCount,
      provenance: stats,
      provenanceMatchesSynthesis:
        stats.storiesProcessed === synthesisStoryCount,
      generatedBy: briefing.generatedBy,
    })
  );
}

export function logBriefingVerifyFailure(
  cadence: BriefingCadence,
  mode: BriefingMode,
  failedRule: string,
  reason: BriefingFallbackReason,
  detail?: string,
  extra?: Record<string, unknown>
): void {
  console.error(
    "[WEEKLY_VERIFY_FAILURE]",
    auditPayload({
      cadence,
      mode,
      failedRule,
      reason,
      detail,
      ...extra,
    })
  );
}

export function logBriefingFallbackTrigger(
  cadence: BriefingCadence,
  mode: BriefingMode,
  reason: BriefingFallbackReason,
  detail: string,
  extra?: Record<string, unknown>
): void {
  console.error(
    "[WEEKLY_FALLBACK_TRIGGER]",
    auditPayload({
      cadence,
      mode,
      reason,
      detail,
      ...extra,
    })
  );
}

export function logBriefingOutcome(
  outcome: BriefingGenerationOutcome,
  cadence: BriefingCadence,
  mode: BriefingMode,
  briefing: IntelligenceBriefing,
  extra?: Record<string, unknown>
): void {
  const stats = extractBriefingProvenanceStats(briefing);
  console.log(
    "[BRIEFING_OUTCOME]",
    auditPayload({
      cadence,
      mode,
      outcome,
      source:
        outcome === "LLM_GENERATED"
          ? "LLM_GENERATED"
          : outcome === "EDITORIAL_FALLBACK"
            ? "EDITORIAL_FALLBACK"
            : outcome,
      generatedBy: briefing.generatedBy,
      headline: briefing.headline?.slice(0, 100),
      ...stats,
      ...extra,
    })
  );
}

export type BriefingVerifyResult = {
  ok: boolean;
  failedRule?: string;
  reason?: BriefingFallbackReason;
  detail?: string;
};

/** Run all post-parse checks before accepting LLM output. */
export function verifyBriefingOutput(
  briefing: IntelligenceBriefing,
  mode: BriefingMode,
  cadence: BriefingCadence,
  corpusPoolSize: number,
  synthesisStoryCount: number
): BriefingVerifyResult {
  if (briefingContainsRefusal(briefing)) {
    return {
      ok: false,
      failedRule: "model_refusal_in_fields",
      reason: "model_refusal",
      detail: "Briefing fields contain model decline text",
    };
  }

  if (!briefingMatchesCadence(briefing, mode, cadence)) {
    return {
      ok: false,
      failedRule: "cadence_mode_mismatch",
      reason: "cadence_mismatch",
      detail: `Expected ${cadence}/${mode}`,
    };
  }

  if (!briefingIsUserSafe(briefing)) {
    return {
      ok: false,
      failedRule: "user_unsafe_content",
      reason: "user_unsafe",
      detail: "Headline missing or contains developer diagnostics",
    };
  }

  const stats = extractBriefingProvenanceStats(briefing);
  if (
    stats.storiesProcessed !== synthesisStoryCount &&
    synthesisStoryCount > 0
  ) {
    return {
      ok: false,
      failedRule: "provenance_synthesis_mismatch",
      reason: "provenance_mismatch",
      detail: `provenance.storiesProcessed=${stats.storiesProcessed} synthesis=${synthesisStoryCount}`,
    };
  }

  const min = BRIEFING_CORPUS_MIN[cadence];
  if (stats.storiesProcessed <= 1 && corpusPoolSize > 1) {
    return {
      ok: false,
      failedRule: "single_story_regression",
      reason: "corpus_threshold",
      detail: "Only 1 story in synthesis despite larger corpus",
    };
  }

  if (
    stats.storiesProcessed < min &&
    corpusPoolSize >= min &&
    synthesisStoryCount >= min
  ) {
    return {
      ok: false,
      failedRule: "cluster_coverage_gap",
      reason: "cluster_mismatch",
      detail: `Synthesis had ${synthesisStoryCount} stories but provenance reports ${stats.storiesProcessed}`,
    };
  }

  if (!briefingMeetsCorpusThreshold(cadence, briefing, corpusPoolSize)) {
    console.warn(
      "[WEEKLY_VERIFY_WARN]",
      auditPayload({
        cadence,
        mode,
        rule: "corpus_below_target",
        storiesProcessed: stats.storiesProcessed,
        corpusPoolSize,
        min,
        note: "Accepting LLM output — synthesis used maximum available material",
      })
    );
  }

  return { ok: true };
}

export function classifyModelError(error: string): BriefingFallbackReason {
  const lower = error.toLowerCase();
  if (
    lower.includes("context") ||
    lower.includes("token") ||
    lower.includes("too long") ||
    lower.includes("413") ||
    lower.includes("prompt is too long") ||
    lower.includes("maximum")
  ) {
    return "context_limit";
  }
  if (lower.includes("parse") || lower.includes("could not parse")) {
    return "parse_failure";
  }
  if (lower.includes("refusal") || lower.includes("declined")) {
    return "model_refusal";
  }
  if (lower.includes("corpus threshold") || lower.includes("below corpus")) {
    return "corpus_threshold";
  }
  return "model_error";
}

export function sectionsFromDraft(input: {
  mode: BriefingMode;
  headline: string;
  whatChanged?: string;
  whyYou?: string;
  whyItMatters?: string;
  watchItems?: string[];
  positioning?: string;
}): BriefingParsedSections {
  const impact =
    input.mode === "for-you" ? input.whyYou : input.whyItMatters;
  const watchText =
    input.watchItems?.join("\n") ?? "";
  return {
    headline: input.headline,
    overview: Boolean(input.whatChanged?.trim()),
    overviewChars: input.whatChanged?.trim().length ?? 0,
    impact: Boolean(impact?.trim()),
    impactChars: impact?.trim().length ?? 0,
    watch: Boolean(watchText.trim()),
    watchChars: watchText.trim().length,
    action: Boolean(input.positioning?.trim()),
    actionChars: input.positioning?.trim().length ?? 0,
  };
}

export function finalizeBriefingOutcome(
  briefing: IntelligenceBriefing,
  cadence: BriefingCadence
): IntelligenceBriefing {
  return normalizeBriefing(briefing, cadence);
}
