import "server-only";

import {
  detectNarrativeTheme,
  type NarrativeTheme,
} from "@/lib/editorial/narrative-clusters";
import { THEME_LABELS } from "@/lib/briefing/narrative-synthesis";
import { storyHasUsableMaterial } from "@/lib/briefing/source-material";
import {
  isDeveloperBriefingDiagnostic,
  stripBriefingDiagnostics,
} from "@/lib/briefing/shared/diagnostics";
import {
  allStoriesFromSelection,
  type WeeklyBriefingSelection,
} from "@/lib/briefing/weekly-selection";
import {
  rankStoriesForUser,
  rankStoriesGlobal,
} from "@/lib/personalization/engine";
import type { BriefingCadence, BriefingMode } from "@/lib/briefing/types";
import type { OnboardingProfile, Story } from "@/lib/types";

export {
  isDeveloperBriefingDiagnostic,
  stripBriefingDiagnostics,
} from "@/lib/briefing/shared/diagnostics";

export function briefingIsUserSafe(briefing: {
  headline?: string;
  summary?: string;
  aiError?: string;
  openaiError?: string;
}): boolean {
  if (isDeveloperBriefingDiagnostic(briefing.aiError)) return false;
  if (isDeveloperBriefingDiagnostic(briefing.openaiError)) return false;
  if (isDeveloperBriefingDiagnostic(briefing.headline)) return false;
  if (!briefing.headline?.trim()) return false;
  return true;
}

function rankRescuePool(
  corpus: Story[],
  mode: BriefingMode,
  profile: OnboardingProfile | null
): Story[] {
  if (mode === "for-you" && profile?.completed) {
    return rankStoriesForUser(corpus, profile);
  }
  return rankStoriesGlobal(corpus);
}

/**
 * Guarantee at least one story in the selection — use highest-ranked corpus stories.
 */
export function ensureBriefingSelectionMaterial(
  selection: WeeklyBriefingSelection,
  rescueCorpus: Story[],
  mode: BriefingMode,
  profile: OnboardingProfile | null,
  perThread = 2
): { selection: WeeklyBriefingSelection; rescueApplied: boolean } {
  const existing = allStoriesFromSelection(selection);
  if (existing.length > 0) {
    return { selection, rescueApplied: false };
  }

  if (rescueCorpus.length === 0) {
    return { selection, rescueApplied: false };
  }

  const ranked = rankRescuePool(rescueCorpus, mode, profile);
  const withMaterial = ranked.filter((s) => storyHasUsableMaterial(s));
  const picks = (withMaterial.length > 0 ? withMaterial : ranked).slice(
    0,
    Math.max(perThread, 3)
  );

  if (picks.length === 0) {
    return { selection, rescueApplied: false };
  }

  const theme = detectNarrativeTheme(picks[0]!) as NarrativeTheme;
  const cadence: BriefingCadence = selection.cadence;

  const rescued: WeeklyBriefingSelection = {
    ...selection,
    cacheKeyId: `${selection.cacheKeyId}:rescue`,
    threads: [
      {
        clusterId: "rescue:top-ranked",
        theme,
        label: THEME_LABELS[theme] ?? "Top ranked developments",
        personalScore: 0,
        stories: picks,
      },
    ],
  };

  return { selection: rescued, rescueApplied: true };
}
