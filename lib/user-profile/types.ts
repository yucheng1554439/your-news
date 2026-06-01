import type { TopicPreferences } from "@/lib/personalization/topic-preferences";
import type { ReadingSignalsMetadata } from "@/lib/personalization/reading-signals-metadata";
import type { SavedStoriesMetadata } from "@/lib/saved-stories/metadata";

/** Per-user behavioral + personalization data — stored in Redis/KV, not Clerk. */
export type UserIntelligenceRecord = {
  version: 1;
  userId: string;
  topicPreferences: TopicPreferences;
  savedStories: SavedStoriesMetadata;
  readingSignals: ReadingSignalsMetadata;
  updatedAt: number;
  /** Set when legacy Clerk metadata was migrated into KV. */
  migratedFromClerkAt?: number;
};

export type UserIntelligencePatch = {
  topicPreferences?: TopicPreferences;
  savedStories?: SavedStoriesMetadata;
  readingSignals?: ReadingSignalsMetadata;
};
