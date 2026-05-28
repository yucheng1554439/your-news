import "server-only";

import { PERSIST_KEYS } from "@/lib/persistence/keys";
import { persistGet, persistSet } from "@/lib/persistence/kv-store";
import type { PersistBackend } from "@/lib/persistence/kv-store";

export type IntelligenceMeta = {
  version: 1;
  aiModel: string;
  lastSuccessfulRefreshAt: number;
  lastRefreshAttemptAt: number;
  storiesFetchedAt: number;
  storyCount: number;
  profileFingerprint: string;
  backend: PersistBackend;
};

export async function readIntelligenceMeta(): Promise<IntelligenceMeta | null> {
  const meta = await persistGet<IntelligenceMeta>(PERSIST_KEYS.intelligenceMeta);
  if (meta?.version === 1) return meta;
  return null;
}

export async function writeIntelligenceMeta(
  meta: Omit<IntelligenceMeta, "version">
): Promise<boolean> {
  const result = await persistSet(PERSIST_KEYS.intelligenceMeta, {
    version: 1,
    ...meta,
  });
  return result.ok;
}
