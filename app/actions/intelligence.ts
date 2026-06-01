"use server";

import { getSavedStoriesFromClerk } from "@/app/actions/saved-stories";
import { recordAiIrrelevantForUser } from "@/app/actions/reading-signals";
import { getEnrichedStoryFromSnapshot } from "@/lib/intelligence/platform-snapshot";
import { upsertStoryInPlatformSnapshot } from "@/lib/persistence/intelligence-snapshot-persist";
import {
  enrichStoryWithIntelligence,
  enrichStoryWithMetadataSignal,
} from "@/lib/intelligence/engine";
import { needsMetadataIntelligence } from "@/lib/extraction/article-body";
import { ensureStoryArticleBody } from "@/lib/extraction/resolve-body";
import { hasDisplayableIntelligence } from "@/lib/intelligence/display";
import {
  mergeStoryIntelligenceSafely,
  verifyIntelligenceMatch,
  logIntelligenceMismatch,
  logIntelligenceProvenance,
} from "@/lib/intelligence/provenance";
import { intelligenceDeclaresIrrelevant } from "@/lib/intelligence/irrelevance";
import {
  assessStoryRelevance,
  logRelevanceSkip,
  passesIntelligenceGate,
} from "@/lib/personalization/relevance-gate";
import { getStoryBySlug } from "@/lib/data/stories";
import { getStoryPool } from "@/lib/news/story-pool";
import type { OnboardingProfile, Story } from "@/lib/types";

function mergeFetched(base: Story, enriched: Story): Story {
  const match = verifyIntelligenceMatch(base, enriched);
  if (!match.match) {
    logIntelligenceMismatch("fetchStoryIntelligence", match);
    return base;
  }
  return mergeStoryIntelligenceSafely(base, enriched, "fetchStoryIntelligence");
}

async function resolveDisplayIntelligence(
  base: Story,
  profile: OnboardingProfile | null
): Promise<Story> {
  const pool = await getStoryPool();
  const anchor = await ensureStoryArticleBody(base);

  if (!needsMetadataIntelligence(anchor)) {
    return enrichStoryWithIntelligence(anchor, profile, {
      pool: pool.stories,
    });
  }

  return enrichStoryWithMetadataSignal(anchor, profile, pool.stories);
}

/**
 * Read-only for page load — returns snapshot intelligence when present.
 * On provenance mismatch, returns metadata signal summary immediately.
 */
export async function fetchStoryIntelligence(
  slug: string,
  profile: OnboardingProfile | null
): Promise<Story | null> {
  const fromSnapshot = await getEnrichedStoryFromSnapshot(slug);
  const base = await getStoryBySlug(slug, { enrich: false });
  if (!base) return null;

  if (fromSnapshot && hasDisplayableIntelligence(fromSnapshot)) {
    const merged = mergeFetched(base, fromSnapshot);
    const match = verifyIntelligenceMatch(base, merged);
    if (hasDisplayableIntelligence(merged) && match.match) {
      logIntelligenceProvenance(
        base,
        {
          anchorSlug:
            merged.intelligenceAnchorSlug ??
            fromSnapshot.intelligenceAnchorSlug ??
            slug,
          anchorHeadline:
            merged.intelligenceAnchorHeadline ??
            fromSnapshot.intelligenceAnchorHeadline ??
            base.headline,
          materialSlugs:
            merged.intelligenceMaterialSlugs ??
            fromSnapshot.intelligenceMaterialSlugs ??
            [slug],
          usedClusterMaterial: Boolean(fromSnapshot.intelligenceClusterId),
          clusterId: fromSnapshot.intelligenceClusterId,
        },
        match
      );
      return merged;
    }

    logIntelligenceMismatch("fetchStoryIntelligence snapshot rejected", match);
    return resolveDisplayIntelligence(base, profile);
  }

  if (fromSnapshot) {
    const merged = mergeFetched(base, fromSnapshot);
    if (hasDisplayableIntelligence(merged)) {
      return merged;
    }
  }

  if (hasDisplayableIntelligence(base)) {
    const match = verifyIntelligenceMatch(base, base);
    if (match.match) return base;
  }

  return resolveDisplayIntelligence(base, profile);
}

/**
 * Background backfill when a story is missing from snapshot (does not block page SSR).
 */
export async function generateStoryIntelligenceIfMissing(
  slug: string,
  profile: OnboardingProfile | null
): Promise<{ ok: boolean; story?: Story; error?: string }> {
  const existing = await getEnrichedStoryFromSnapshot(slug);
  const base = await getStoryBySlug(slug, { profile, enrich: false });
  if (!base) {
    return { ok: false, error: "Story not found" };
  }

  if (existing && hasDisplayableIntelligence(existing)) {
    const merged = mergeFetched(base, existing);
    if (hasDisplayableIntelligence(merged)) {
      return { ok: true, story: merged };
    }
  }

  const savedRefs =
    profile?.completed ? await getSavedStoriesFromClerk() : [];
  const savedSlugs = savedRefs.map((r) => r.slug);

  if (
    profile?.completed &&
    !passesIntelligenceGate(base, profile, null, { savedSlugs })
  ) {
    logRelevanceSkip(
      "skip on-demand intelligence",
      base,
      assessStoryRelevance(base, profile, null, { savedSlugs })
    );
    return { ok: false, error: "Below relevance threshold" };
  }

  try {
    const pool = await getStoryPool();
    const anchor = await ensureStoryArticleBody(base);
    let enriched = await enrichStoryWithIntelligence(anchor, profile, {
      pool: pool.stories,
    });

    if (!hasDisplayableIntelligence(enriched) && needsMetadataIntelligence(anchor)) {
      enriched = await enrichStoryWithMetadataSignal(
        anchor,
        profile,
        pool.stories
      );
    }

    if (!hasDisplayableIntelligence(enriched)) {
      return { ok: false, error: "Analysis unavailable" };
    }

    if (profile?.completed && intelligenceDeclaresIrrelevant(enriched)) {
      await recordAiIrrelevantForUser(slug);
      logRelevanceSkip(
        "skip on-demand — AI off-profile",
        base,
        assessStoryRelevance(enriched, profile, null, { savedSlugs })
      );
      return { ok: false, error: "Off-profile for this reader" };
    }

    const match = verifyIntelligenceMatch(base, enriched);
    if (!match.match) {
      logIntelligenceMismatch("generateStoryIntelligenceIfMissing", match);
      if (needsMetadataIntelligence(anchor)) {
        enriched = await enrichStoryWithMetadataSignal(
          anchor,
          profile,
          pool.stories
        );
      } else {
        enriched = await enrichStoryWithIntelligence(anchor, profile, {
          pool: pool.stories,
        });
      }
    }

    if (!hasDisplayableIntelligence(enriched)) {
      return { ok: false, error: "Analysis anchor mismatch" };
    }

    const saved = await upsertStoryInPlatformSnapshot(enriched);
    if (!saved) {
      return { ok: true, story: enriched };
    }

    return { ok: true, story: enriched };
  } catch {
    try {
      const pool = await getStoryPool();
      const anchor = await ensureStoryArticleBody(base);
      const fallback = needsMetadataIntelligence(anchor)
        ? await enrichStoryWithMetadataSignal(anchor, profile, pool.stories)
        : await enrichStoryWithIntelligence(anchor, profile, {
            pool: pool.stories,
          });
      if (hasDisplayableIntelligence(fallback)) {
        return { ok: true, story: fallback };
      }
    } catch {
      /* fall through */
    }
    return { ok: false, error: "Analysis unavailable" };
  }
}
