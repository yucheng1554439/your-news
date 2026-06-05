import "server-only";

/**
 * @deprecated Daily selection now uses full-corpus landscape via weekly-pattern-selection.
 * Kept for import stability — re-exports landscape selector.
 */
export { selectDailyEventBriefing as selectDailyLandscapeBriefing } from "@/lib/briefing/weekly-pattern-selection";
