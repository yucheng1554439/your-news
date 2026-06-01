import "server-only";

import {
  enrichStoryWithIntelligence,
  enrichStoryWithMetadataSignal,
} from "@/lib/intelligence/engine";
import { needsMetadataIntelligence } from "@/lib/extraction/article-body";
import { ensureStoryArticleBody } from "@/lib/extraction/resolve-body";
import { hasDisplayableIntelligence } from "@/lib/intelligence/display";
import { intelligenceDeclaresIrrelevant } from "@/lib/intelligence/irrelevance";
import { isAIConfigured } from "@/lib/intelligence/provider";
import { verifyIntelligenceMatch } from "@/lib/intelligence/provenance";
import {
  assessStoryRelevance,
  logRelevanceSkip,
  passesIntelligenceGate,
} from "@/lib/personalization/relevance-gate";
import type { OnboardingProfile, Story } from "@/lib/types";

const REFRESH_CONCURRENCY = 4;

function shouldSnapshotIntelligence(story: Story): boolean {
  return hasDisplayableIntelligence(story);
}

/**
 * Generate and return story intelligence for refresh snapshot (background batch).
 */
export async function batchEnrichStoriesForSnapshot(
  targets: Story[],
  profile: OnboardingProfile | null,
  pool: Story[] = targets,
  savedSlugs: string[] = []
): Promise<{
  enrichedBySlug: Record<string, Story>;
  generated: number;
  failed: number;
  skipped: number;
}> {
  const enrichedBySlug: Record<string, Story> = {};
  let generated = 0;
  let failed = 0;
  let skipped = 0;

  if (targets.length === 0) {
    return { enrichedBySlug, generated, failed, skipped };
  }

  if (!isAIConfigured()) {
    console.warn(
      "[INTELLIGENCE] Story batch skipped — AI provider not configured"
    );
    return { enrichedBySlug, generated, failed: targets.length, skipped: 0 };
  }

  console.log(
    `[INTELLIGENCE] Story intelligence batch — ${targets.length} targets (concurrency ${REFRESH_CONCURRENCY})`
  );

  let index = 0;

  async function worker() {
    while (index < targets.length) {
      const i = index++;
      const story = targets[i]!;
      try {
        if (
          profile?.completed &&
          !passesIntelligenceGate(story, profile, null, { savedSlugs })
        ) {
          skipped += 1;
          logRelevanceSkip(
            "skip batch intelligence",
            story,
            assessStoryRelevance(story, profile, null, { savedSlugs })
          );
          continue;
        }

        let enriched = await enrichStoryWithIntelligence(story, profile, {
          pool,
        });

        const anchor = await ensureStoryArticleBody(story);
        if (!verifyIntelligenceMatch(story, enriched).match) {
          if (needsMetadataIntelligence(anchor)) {
            enriched = await enrichStoryWithMetadataSignal(story, profile, pool);
          }
        }

        if (intelligenceDeclaresIrrelevant(enriched)) {
          skipped += 1;
          logRelevanceSkip(
            "skip batch — AI off-profile",
            story,
            assessStoryRelevance(enriched, profile!, null, { savedSlugs })
          );
          continue;
        }

        enrichedBySlug[story.slug] = enriched;
        if (shouldSnapshotIntelligence(enriched)) {
          generated += 1;
          console.log(
            `[INTELLIGENCE] Story ${generated}/${targets.length} — ${story.slug.slice(0, 48)}`
          );
        } else {
          failed += 1;
          console.warn(
            `[INTELLIGENCE] Story fallback (not snapshotted) — ${story.slug}`
          );
        }
      } catch (err) {
        failed += 1;
        const msg = err instanceof Error ? err.message : "unknown error";
        console.warn(`[INTELLIGENCE] Story failed — ${story.slug}: ${msg}`);
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(REFRESH_CONCURRENCY, targets.length) },
      () => worker()
    )
  );

  console.log(
    `[INTELLIGENCE] Story batch complete — generated=${generated} failed=${failed} skipped=${skipped}`
  );

  return { enrichedBySlug, generated, failed, skipped: 0 };
}
