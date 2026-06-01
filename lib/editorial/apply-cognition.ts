import "server-only";

import {
  compareByEditorialImportance,
  scoreStoryImportance,
  importanceLabelFromScore,
  legacyImportanceFromLabel,
} from "@/lib/importance-scoring";
import { assessStrategicSignal, isNoiseStory } from "@/lib/signal/strategic-score";
import {
  getSourceAuthorityWeight,
  getStorySourceTier,
  isPromotionalSource,
  requiresCorroboration,
} from "@/lib/editorial/source-authority";
import {
  attachClusterMetadata,
  buildNarrativeClusters,
  detectNarrativeTheme,
  extractEntities,
} from "@/lib/editorial/narrative-clusters";
import { enrichStoryTags } from "@/lib/intelligence/story-tags";
import type { Story } from "@/lib/types";

function preEnrich(story: Story): Story {
  const tagged = enrichStoryTags(story);
  return {
    ...tagged,
    sourceTier: getStorySourceTier(tagged),
    narrativeTheme: tagged.narrativeTheme ?? detectNarrativeTheme(tagged),
    narrativeEntities: tagged.narrativeEntities ?? extractEntities(tagged),
  };
}

function scoreWithCognition(
  story: Story,
  clusterCorroboration: number,
  clusterSize: number
): Story {
  const assessment = assessStrategicSignal(story);
  const tier = getStorySourceTier(story);
  const authority = getSourceAuthorityWeight(tier);

  let strategic = assessment.strategicSignal * (0.85 + authority * 0.15);
  if (!assessment.lowSignal && assessment.signalClass === "signal") {
    strategic = Math.min(1, strategic + clusterCorroboration * 0.12);
  }

  const withSignal: Story = {
    ...story,
    strategicSignal: strategic,
    lowSignal: assessment.lowSignal,
    signalClass: assessment.signalClass,
    corroborationScore: clusterCorroboration,
    clusterSize,
  };

  const distinctSources = clusterSize >= 2 ? 2 : 1;
  const baseImportance = scoreStoryImportance(withSignal, {
    sourceCount: distinctSources,
  });

  let importanceScore = baseImportance;

  if (!isNoiseStory(withSignal)) {
    importanceScore += Math.round(authority * 0.6);
    importanceScore += Math.round(clusterCorroboration * 0.8);
  }

  if (tier === 3) {
    importanceScore -= 2;
    if (clusterSize < 2 || clusterCorroboration < 0.4) {
      importanceScore = Math.min(importanceScore, 5);
    }
  }

  if (isPromotionalSource(story) || isNoiseStory(withSignal)) {
    importanceScore = Math.min(importanceScore, 4);
  }

  if (requiresCorroboration(story) && clusterSize < 2) {
    importanceScore = Math.min(importanceScore, 5);
  }

  importanceScore = Math.round(Math.min(10, Math.max(1, importanceScore)));

  const importanceLabel = importanceLabelFromScore(importanceScore, withSignal);

  return {
    ...withSignal,
    importanceScore,
    importanceLabel,
    importance: legacyImportanceFromLabel(importanceLabel),
  };
}

/**
 * Full editorial cognition pass: clusters, corroboration, source authority.
 */
export function applyEditorialCognition(stories: Story[]): Story[] {
  if (stories.length === 0) return stories;

  const prepared = stories.map(preEnrich);
  const clusters = buildNarrativeClusters(prepared);

  const clusterBySlug = new Map<
    string,
    { corroboration: number; size: number }
  >();
  for (const c of clusters) {
    for (const s of c.stories) {
      clusterBySlug.set(s.slug, {
        corroboration: c.corroborationScore,
        size: c.size,
      });
    }
  }

  const scored = prepared.map((story) => {
    const meta = clusterBySlug.get(story.slug) ?? {
      corroboration: 0.15,
      size: 1,
    };
    return scoreWithCognition(story, meta.corroboration, meta.size);
  });

  const withClusters = attachClusterMetadata(scored, clusters);

  return [...withClusters].sort(compareByEditorialImportance);
}

/** Lighter pass when stories already have importance (re-cluster on read). */
export function refreshEditorialCognition(stories: Story[]): Story[] {
  return applyEditorialCognition(stories);
}
