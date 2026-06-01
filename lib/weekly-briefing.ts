import {
  deriveFallbackHeadline,
  deriveFallbackSummary,
} from "@/lib/briefing/format-weekly";
import { getPeriodLabel } from "@/lib/briefing/cadence";
import { buildProvenanceFromSelection } from "@/lib/briefing/provenance";
import { formatBriefingForDisplay } from "@/lib/briefing/format-display";
import { deriveKeySignal } from "@/lib/briefing/key-signal";
import { enrichBriefingSelection } from "@/lib/briefing/enrich-selection";
import {
  allStoriesFromSelection,
  selectWeeklyBriefingSelection,
  ensureBriefingSelectionMaterial,
  type BriefingSelectionOptions,
} from "@/lib/briefing/weekly-selection";
import { stripBriefingDiagnostics } from "@/lib/briefing/weekly-rescue";
import type {
  BriefingCadence,
  BriefingMode,
  IntelligenceBriefing,
} from "@/lib/briefing/types";
import { normalizeBriefing } from "@/lib/briefing/types";
import type { OnboardingProfile, Story } from "@/lib/types";

export type {
  IntelligenceBriefing,
  WeeklyBriefing,
  WeeklyBriefingMode,
  BriefingCadence,
  BriefingMode,
} from "@/lib/briefing/types";

export function buildWeeklyBriefingSync(
  stories: Story[],
  mode: BriefingMode,
  profile: OnboardingProfile | null,
  cadence: BriefingCadence = "weekly",
  options?: BriefingSelectionOptions
): IntelligenceBriefing {
  const corpus = options?.corpus ?? stories;
  let selection = enrichBriefingSelection(
    selectWeeklyBriefingSelection(stories, mode, profile, cadence, options),
    { corpus }
  );

  const ensured = ensureBriefingSelectionMaterial(
    selection,
    corpus,
    mode,
    profile,
    cadence === "daily" ? 1 : 2
  );
  if (ensured.rescueApplied) {
    selection = enrichBriefingSelection(ensured.selection, { corpus });
  } else {
    selection = ensured.selection;
  }

  const pool = allStoriesFromSelection(selection);
  const provenance = buildProvenanceFromSelection(selection);

  const draft = stripBriefingDiagnostics(
    normalizeBriefing(
      {
        cadence,
        mode,
        periodLabel: getPeriodLabel(cadence),
        headline: deriveFallbackHeadline(pool, mode, profile, selection),
        summary: deriveFallbackSummary(pool, mode, profile, selection),
        whatChanged: deriveFallbackSummary(pool, mode, profile, selection),
        keySignal: deriveKeySignal(pool),
        provenance,
        generatedBy: "fallback",
        generatedAt: Date.now(),
      },
      cadence
    )
  );
  draft.summary = formatBriefingForDisplay(draft);
  return draft;
}
