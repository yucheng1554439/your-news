import "server-only";

import {
  hasLeakedIntelligenceDebug,
  humanizeClusterLabel,
} from "@/lib/briefing/shared/for-you-corpus-signals";
import {
  briefingNeedsSectionRepair,
  isToxicWatchText,
  isValidForYouAction,
  isWatchLanguage,
  logForYouSectionValidation,
  resolveForYouHeadline,
  validateForYouSections,
  type ForYouSectionSet,
} from "@/lib/briefing/shared/for-you-sections";
import {
  actionRepeatsWatch,
  isGenericForYouHeadline,
} from "@/lib/briefing/shared/for-you-section-coherence";
import { sectionsTooSimilar } from "@/lib/briefing/shared/section-similarity";
import {
  isGenericBriefingSection,
  isNoDirectImpactText,
} from "@/lib/briefing/shared/impact-fallback";
import { deriveForYouWeeklyActionText, resolveForYouActionFromBriefing } from "@/lib/briefing/for-you-action";
import { deriveForYouWeeklyImpact } from "@/lib/briefing/for-you-impact";
import { deriveForYouWeeklyWatchText } from "@/lib/briefing/for-you-watch";
import { deriveFallbackSummary } from "@/lib/briefing/format-weekly";
import {
  allStoriesFromSelection,
  type WeeklyBriefingSelection,
} from "@/lib/briefing/weekly-selection";
import type { IntelligenceBriefing } from "@/lib/briefing/types";
import type { OnboardingProfile } from "@/lib/types";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";

function deriveForYouOverview(
  briefing: IntelligenceBriefing,
  selection: WeeklyBriefingSelection,
  profile: OnboardingProfile | null
): string {
  const pool = allStoriesFromSelection(selection);
  const raw = briefing.whatChanged?.trim();
  const headline = briefing.headline?.trim() ?? "";

  if (
    raw &&
    raw.length >= 150 &&
    !isGenericBriefingSection(raw) &&
    !sectionsTooSimilar(raw, headline) &&
    !isGenericForYouHeadline(raw)
  ) {
    return raw;
  }

  if (selection.threads.length > 1) {
    const multi = deriveFallbackSummary(pool, "for-you", profile, selection);
    const first = multi.split(/\n\n+/)[0]?.trim();
    if (first && first.length >= 120) return first;
    if (multi.length >= 150) return multi;
  }
  const ranked = [...selection.threads].sort(
    (a, b) => b.personalScore - a.personalScore
  );
  const lead = ranked[0];
  if (!lead) {
    return "Several narrative threads developed in parallel across your focus areas this period.";
  }
  const topic = humanizeClusterLabel(lead.label);
  const digest =
    lead.stories[0]?.summary?.split(/[.!?]/)[0]?.trim() ?? topic;
  return `What happened: ${topic} led your feed this period — ${digest}. ${
    ranked.length > 1
      ? `Parallel movement on ${ranked
          .slice(1, 3)
          .map((t) => humanizeClusterLabel(t.label))
          .join(" and ")} also matters; see Impact for how they connect to your priorities.`
      : "Adjacent themes may still be developing on desk coverage."
  }`;
}

function buildDistinctSections(
  briefing: IntelligenceBriefing,
  selection: WeeklyBriefingSelection,
  profile: OnboardingProfile | null,
  intelligence?: UserIntelligenceProfile | null
): ForYouSectionSet & { headline: string } {
  let overview = deriveForYouOverview(briefing, selection, profile);
  let impact = deriveForYouWeeklyImpact(profile, selection, intelligence);
  let watch = deriveForYouWeeklyWatchText(selection);
  let action = deriveForYouWeeklyActionText(profile, intelligence, selection);

  if (!isValidForYouAction(action)) {
    action = resolveForYouActionFromBriefing(
      undefined,
      profile,
      intelligence,
      selection
    );
  }

  let headline = resolveForYouHeadline(briefing, selection);

  const maxPasses = 4;
  for (let pass = 0; pass < maxPasses; pass++) {
    const validation = validateForYouSections(
      { overview, impact, watch, action },
      selection,
      headline
    );
    if (validation.ok) break;

    if (validation.reasons.some((r) => r.includes("generic headline"))) {
      headline = resolveForYouHeadline(
        { ...briefing, headline },
        selection
      );
    }

    if (
      validation.reasons.some((r) => r.startsWith("overview")) ||
      sectionsTooSimilar(overview, impact) ||
      sectionsTooSimilar(overview, headline)
    ) {
      overview = deriveForYouOverview(briefing, selection, profile);
    }
    if (
      validation.reasons.some((r) => r.startsWith("impact")) ||
      validation.reasons.some((r) => r.includes("debug")) ||
      sectionsTooSimilar(overview, impact) ||
      hasLeakedIntelligenceDebug(impact)
    ) {
      impact = deriveForYouWeeklyImpact(profile, selection, intelligence);
    }
    if (
      validation.reasons.some((r) => r.includes("watch")) ||
      validation.reasons.some((r) => r.includes("generic watch")) ||
      sectionsTooSimilar(impact, watch) ||
      watch.split(/\n\n/).some(isToxicWatchText) ||
      hasLeakedIntelligenceDebug(watch)
    ) {
      watch = deriveForYouWeeklyWatchText(selection);
    }
    if (
      validation.reasons.some((r) => r.startsWith("action")) ||
      validation.reasons.some((r) => r.includes("generic action")) ||
      validation.reasons.some((r) => r.includes("corpus entity")) ||
      sectionsTooSimilar(watch, action) ||
      sectionsTooSimilar(impact, action) ||
      isWatchLanguage(action) ||
      actionRepeatsWatch(action, watch)
    ) {
      action = deriveForYouWeeklyActionText(profile, intelligence, selection);
      if (!isValidForYouAction(action)) {
        action = resolveForYouActionFromBriefing(
          undefined,
          profile,
          intelligence,
          selection
        );
      }
    }
  }

  return { overview, impact, watch, action, headline };
}

/** Ensure four distinct For You sections with unique purpose. */
export function repairForYouBriefingSections(
  briefing: IntelligenceBriefing,
  selection: WeeklyBriefingSelection,
  profile: OnboardingProfile | null,
  intelligence?: UserIntelligenceProfile | null
): IntelligenceBriefing {
  if (briefing.mode !== "for-you") return briefing;

  const sections = buildDistinctSections(
    briefing,
    selection,
    profile,
    intelligence
  );

  const validation = validateForYouSections(
    sections,
    selection,
    sections.headline
  );
  logForYouSectionValidation(
    {
      overview: sections.overview,
      impact: sections.impact,
      watch: sections.watch,
      action: sections.action,
    },
    validation
  );

  if (!validation.ok) {
    console.warn(
      "[BRIEFING_SECTION_WARNING]",
      JSON.stringify({
        mode: "for-you",
        phase: "repair-incomplete",
        reasons: validation.reasons,
      })
    );
  }

  return {
    ...briefing,
    headline: sections.headline,
    whatChanged: sections.overview,
    whyYou: sections.impact,
    watchItems: sections.watch.split(/\n\n+/).filter(Boolean),
    keySignal: sections.watch.split(/\n\n+/)[0] ?? briefing.keySignal,
    positioning: sections.action,
    decisions: sections.action,
    summary: `${sections.overview}\n\n${sections.impact}`,
  };
}

/** Repair cached briefings on read without full regeneration. */
export function repairForYouBriefingIfNeeded(
  briefing: IntelligenceBriefing,
  selection: WeeklyBriefingSelection,
  profile: OnboardingProfile | null,
  intelligence?: UserIntelligenceProfile | null
): IntelligenceBriefing {
  if (briefing.mode !== "for-you") return briefing;
  if (!briefingNeedsSectionRepair(briefing, selection)) return briefing;
  console.log(
    "[BRIEFING_SECTION_REPAIR]",
    JSON.stringify({ reason: "cached for-you sections duplicated or toxic" })
  );
  return repairForYouBriefingSections(
    briefing,
    selection,
    profile,
    intelligence
  );
}
