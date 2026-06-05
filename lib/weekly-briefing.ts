import "server-only";

import {
  deriveFallbackHeadline,
  deriveFallbackSummary,
} from "@/lib/briefing/format-weekly";
import { getCoveragePeriodFromCorpus } from "@/lib/briefing/cadence";
import { briefingCorpusForCadence } from "@/lib/briefing/briefing-corpus";
import { buildProvenanceFromSelection } from "@/lib/briefing/provenance";
import { formatBriefingForDisplay } from "@/lib/briefing/format-display";
import { deriveKeySignal } from "@/lib/briefing/key-signal";
import { enrichBriefingSelection } from "@/lib/briefing/enrich-selection";
import {
  allStoriesFromSelection,
  selectWeeklyBriefingSelection,
  type BriefingSelectionOptions,
} from "@/lib/briefing/weekly-selection";
import { stripBriefingDiagnostics } from "@/lib/briefing/weekly-rescue";
import type {
  BriefingCadence,
  BriefingMode,
  IntelligenceBriefing,
} from "@/lib/briefing/types";
import { normalizeBriefing } from "@/lib/briefing/shared/normalize";
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

  const pool = allStoriesFromSelection(selection);
  const provenance = buildProvenanceFromSelection(selection);
  const coverage = getCoveragePeriodFromCorpus(
    briefingCorpusForCadence(corpus, cadence),
    cadence
  );

  const draft = stripBriefingDiagnostics(
    normalizeBriefing(
      {
        cadence,
        mode,
        periodLabel: coverage.periodLabel,
        coverageDateMs: coverage.coverageDateMs,
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
