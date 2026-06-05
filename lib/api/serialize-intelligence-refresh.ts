import "server-only";

import type { RefreshIntelligenceResult } from "@/lib/intelligence/platform-snapshot";

export type IntelligenceRefreshApiPayload = {
  ok: boolean;
  refreshedAt: number;
  storiesProcessed: number;
  storiesAdded: number;
  briefingUpdated: boolean;
  signalsUpdated: boolean;
  error?: string;
};

export function serializeIntelligenceRefresh(
  result: RefreshIntelligenceResult
): IntelligenceRefreshApiPayload {
  return {
    ok: result.ok,
    refreshedAt: result.updatedAt,
    storiesProcessed: result.storiesCount,
    storiesAdded: result.storiesAdded,
    briefingUpdated: result.briefingUpdated,
    signalsUpdated: result.signalsUpdated,
    error: result.error,
  };
}
