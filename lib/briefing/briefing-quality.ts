import "server-only";

import {
  isGenericBriefingSection,
  isNoDirectImpactText,
} from "@/lib/briefing/shared/impact-fallback";
import {
  hasDuplicatedNarrativeLabels,
  looksLikeSingleArticleSummary,
  looksLikeSingleCompanySummary,
  MIN_GLOBAL_SECTION_CHARS,
} from "@/lib/briefing/shared/section-heuristics";
import { countRelevantStoriesForProfile } from "@/lib/briefing/briefing-synthesis-fallback";
import { allStoriesFromSelection } from "@/lib/briefing/weekly-selection";
import type { WeeklyBriefingSelection } from "@/lib/briefing/weekly-selection";
import type { IntelligenceBriefing } from "@/lib/briefing/types";
import type { OnboardingProfile } from "@/lib/types";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";

export type BriefingQualityWarningReason =
  | "no_direct_impact_with_relevant_stories"
  | "section_too_short"
  | "single_company_summary"
  | "single_article_summary"
  | "single_cluster_synthesis"
  | "duplicated_narrative_labels"
  | "generic_section"
  | "fragmented_company_mentions";

const COMPANY_FRAGMENT =
  /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b(?:\s+(?:said|announced|reported|shares|stock|IPO|earnings))/g;

function countDistinctCompanies(text: string): number {
  const matches = text.match(COMPANY_FRAGMENT) ?? [];
  const names = new Set(
    matches.map((m) =>
      m.replace(/\s+(said|announced|reported|shares|stock|IPO|earnings).*$/i, "").trim()
    )
  );
  return names.size;
}

function looksFragmented(text: string): boolean {
  const companies = countDistinctCompanies(text);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 12);
  if (companies >= 4 && sentences.length >= 3 && text.length < 400) {
    return true;
  }
  return false;
}

export type BriefingQualityWarning = {
  reason: BriefingQualityWarningReason;
  section: string;
  detail: string;
};

function warn(
  reason: BriefingQualityWarningReason,
  section: string,
  detail: string
): BriefingQualityWarning {
  return { reason, section, detail };
}

function checkSection(
  section: string,
  body: string | undefined,
  briefing: IntelligenceBriefing
): BriefingQualityWarning[] {
  const warnings: BriefingQualityWarning[] = [];
  const text = body?.trim() ?? "";
  if (!text) {
    warnings.push(warn("section_too_short", section, "empty section"));
    return warnings;
  }
  if (text.length < MIN_GLOBAL_SECTION_CHARS) {
    warnings.push(
      warn(
        "section_too_short",
        section,
        `${text.length} chars (min ${MIN_GLOBAL_SECTION_CHARS})`
      )
    );
  }
  if (isGenericBriefingSection(text)) {
    warnings.push(warn("generic_section", section, "template-like language"));
  }
  if (looksLikeSingleCompanySummary(text)) {
    warnings.push(
      warn(
        "single_company_summary",
        section,
        "reads as single-company not multi-narrative"
      )
    );
  }
  if (looksLikeSingleArticleSummary(text)) {
    warnings.push(
      warn("single_article_summary", section, "reads as single-article recap")
    );
  }
  if (hasDuplicatedNarrativeLabels(text)) {
    warnings.push(
      warn("duplicated_narrative_labels", section, "repeated theme labels")
    );
  }
  if (looksFragmented(text)) {
    warnings.push(
      warn(
        "fragmented_company_mentions",
        section,
        "multiple company name-drops without synthesis"
      )
    );
  }
  if (
    section === "impact" &&
    briefing.mode === "for-you" &&
    isNoDirectImpactText(text)
  ) {
    warnings.push(
      warn("no_direct_impact_with_relevant_stories", section, text.slice(0, 80))
    );
  }
  return warnings;
}

export function auditBriefingQuality(
  briefing: IntelligenceBriefing,
  selection: WeeklyBriefingSelection,
  profile: OnboardingProfile | null,
  intelligence?: UserIntelligenceProfile | null
): BriefingQualityWarning[] {
  const pool = allStoriesFromSelection(selection);
  const relevantCount = countRelevantStoriesForProfile(
    pool,
    profile,
    intelligence
  );

  const warnings: BriefingQualityWarning[] = [];

  if (
    briefing.mode === "global" &&
    pool.length > 20 &&
    selection.threads.length <= 1
  ) {
    warnings.push(
      warn(
        "single_cluster_synthesis",
        "corpus",
        `${pool.length} stories but only ${selection.threads.length} narrative cluster`
      )
    );
  }

  warnings.push(
    ...checkSection("overview", briefing.whatChanged ?? briefing.summary, briefing)
  );

  if (briefing.mode === "for-you") {
    warnings.push(...checkSection("impact", briefing.whyYou, briefing));
    if (isNoDirectImpactText(briefing.whyYou) && relevantCount > 5) {
      warnings.push(
        warn(
          "no_direct_impact_with_relevant_stories",
          "impact",
          `relevantStoryCount=${relevantCount} but whyYou is placeholder`
        )
      );
    }
  } else {
    warnings.push(...checkSection("impact", briefing.whyItMatters, briefing));
  }

  const watchText =
    briefing.watchItems?.join("\n") ?? briefing.keySignal ?? "";
  warnings.push(...checkSection("watch", watchText, briefing));

  const action = briefing.positioning ?? briefing.decisions ?? "";
  if (action.trim()) {
    warnings.push(...checkSection("action", action, briefing));
  }

  for (const w of warnings) {
    console.warn(
      "[BRIEFING_QUALITY_WARNING]",
      JSON.stringify({
        cadence: briefing.cadence,
        mode: briefing.mode,
        reason: w.reason,
        section: w.section,
        detail: w.detail,
        relevantStoryCount: relevantCount,
        storiesProcessed: pool.length,
        narrativesProcessed: selection.threads.length,
      })
    );
  }

  return warnings;
}
