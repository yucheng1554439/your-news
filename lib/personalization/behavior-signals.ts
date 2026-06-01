import type { ReadingSignalsMetadata } from "@/lib/personalization/reading-signals-metadata";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import type { SavedStoryRef } from "@/lib/saved-stories/metadata";
import type { BehaviorSignals } from "@/lib/personalization/signals";

/** Map persisted reading signals into personalization behavior inputs. */
export function behaviorSignalsFromReading(
  reading?: ReadingSignalsMetadata | null,
  savedRefs?: SavedStoryRef[]
): BehaviorSignals | undefined {
  const savedSlugs = savedRefs?.map((r) => r.slug) ?? [];
  const readSlugs = reading?.opens.map((o) => o.slug) ?? [];

  if (savedSlugs.length === 0 && readSlugs.length === 0) return undefined;

  return {
    savedSlugs,
    readSlugs,
    avgReadSecondsBySlug: Object.fromEntries(
      (reading?.opens ?? [])
        .filter((o) => o.dwellMs && o.dwellMs > 0)
        .map((o) => [o.slug, Math.round(o.dwellMs! / 1000)])
    ),
  };
}

export function behaviorSignalsFromIntelligence(
  intelligence?: UserIntelligenceProfile | null
): BehaviorSignals | undefined {
  if (!intelligence) return undefined;
  if (
    intelligence.savedSlugs.length === 0 &&
    intelligence.openedSlugs.length === 0
  ) {
    return undefined;
  }
  return {
    savedSlugs: intelligence.savedSlugs,
    readSlugs: intelligence.openedSlugs,
  };
}
