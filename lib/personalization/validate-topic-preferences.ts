import {
  TOPIC_PREFERENCE_OPTIONS,
  type TopicPreferenceId,
} from "@/lib/personalization/topic-options";
import {
  normalizeTopicPreferences,
  type TopicPreferences,
} from "@/lib/personalization/topic-preferences";

/** Core intelligence lanes — at least one must remain available. */
export const STRATEGIC_TOPIC_IDS: TopicPreferenceId[] = [
  "ai",
  "markets",
  "energy",
  "geopolitics",
  "cybersecurity",
  "startups",
  "policy",
  "developer",
  "technology",
];

const VALID_TOPIC_IDS = new Set<string>(
  TOPIC_PREFERENCE_OPTIONS.map((option) => option.id)
);

export const MAX_TOPIC_SELECTIONS = TOPIC_PREFERENCE_OPTIONS.length;

export type TopicPreferencesValidationCode =
  | "all_strategic_excluded"
  | "too_many_selections"
  | "invalid_topic_id"
  | "conflicting_buckets";

export type TopicPreferencesValidationResult =
  | { ok: true; normalized: TopicPreferences }
  | {
      ok: false;
      code: TopicPreferencesValidationCode;
      message: string;
    };

export function topicPreferencesPayloadStats(prefs: TopicPreferences): {
  moreCount: number;
  lessCount: number;
  neverCount: number;
  totalSelections: number;
  payloadSize: number;
} {
  const normalized = normalizeTopicPreferences(prefs);
  const totalSelections =
    normalized.moreOf.length +
    normalized.lessOf.length +
    normalized.neverShow.length;
  return {
    moreCount: normalized.moreOf.length,
    lessCount: normalized.lessOf.length,
    neverCount: normalized.neverShow.length,
    totalSelections,
    payloadSize: new TextEncoder().encode(JSON.stringify(normalized)).length,
  };
}

function hasConflictingBuckets(prefs: TopicPreferences): boolean {
  const seen = new Set<string>();
  for (const id of [...prefs.moreOf, ...prefs.lessOf, ...prefs.neverShow]) {
    if (seen.has(id)) return true;
    seen.add(id);
  }
  return false;
}

export function validateTopicPreferences(
  prefs?: Partial<TopicPreferences> | null
): TopicPreferencesValidationResult {
  const normalized = normalizeTopicPreferences(prefs);

  const allIds = [
    ...normalized.moreOf,
    ...normalized.lessOf,
    ...normalized.neverShow,
  ];

  for (const id of allIds) {
    if (!VALID_TOPIC_IDS.has(id)) {
      return {
        ok: false,
        code: "invalid_topic_id",
        message: `Unknown topic "${id}". Refresh the page and try again.`,
      };
    }
  }

  if (hasConflictingBuckets(normalized)) {
    return {
      ok: false,
      code: "conflicting_buckets",
      message:
        "Each topic can only appear in one preference list. Refresh and try again.",
    };
  }

  if (allIds.length > MAX_TOPIC_SELECTIONS) {
    return {
      ok: false,
      code: "too_many_selections",
      message: `You can configure at most ${MAX_TOPIC_SELECTIONS} topics.`,
    };
  }

  const neverSet = new Set(normalized.neverShow);
  const strategicAvailable = STRATEGIC_TOPIC_IDS.some(
    (id) => !neverSet.has(id)
  );
  if (!strategicAvailable) {
    return {
      ok: false,
      code: "all_strategic_excluded",
      message: "You must leave at least one major topic available.",
    };
  }

  return { ok: true, normalized };
}
