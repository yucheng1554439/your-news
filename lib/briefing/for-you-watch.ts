import "server-only";

import {
  deriveCorpusForYouWatchText,
} from "@/lib/briefing/shared/for-you-corpus-narratives";
import type { WeeklyBriefingSelection } from "@/lib/briefing/weekly-selection";

export { deriveCorpusWatchItem as deriveForYouWatchItem } from "@/lib/briefing/shared/for-you-corpus-narratives";

export function deriveForYouWeeklyWatchText(
  selection: WeeklyBriefingSelection
): string {
  return deriveCorpusForYouWatchText(selection);
}
