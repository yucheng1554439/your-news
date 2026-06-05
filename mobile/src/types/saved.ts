import type { Story, StoryCategory } from "@/types";

export const SAVED_SNAPSHOT_VERSION = 2;

/** Permanent saved story snapshot — survives feed rotation. */
export type SavedStorySnapshot = {
  slug: string;
  headline: string;
  imageUrl: string;
  source: string;
  publishedAt: string;
  category: StoryCategory | string;
  savedAt: number;
  snapshotVersion: number;
  summary: string;
  whyItMatters: string;
  whyItMattersToYou?: string;
  nextWatch?: string;
  tags: string[];
  strategicTags?: string[];
  secondaryTags?: string[];
  sourceUrl?: string;
  articleBody?: string;
  intelligenceGeneratedBy?: Story["intelligenceGeneratedBy"];
  signalSummaryDisclaimer?: string;
  paywallDetected?: boolean;
  needsRehydration?: boolean;
};

/** @deprecated Use SavedStorySnapshot */
export type SavedStoryRef = SavedStorySnapshot;
