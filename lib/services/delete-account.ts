import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import {
  userIntelligenceSnapshotKey,
  userProfileKey,
} from "@/lib/persistence/keys";
import { persistDel } from "@/lib/persistence/kv-delete";

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; error: string; stage?: "persistence" | "clerk" };

/**
 * Permanently deletes user-scoped persistence and the Clerk account.
 * Required for Apple App Store account-deletion guideline (5.1.1(v)).
 */
export async function deleteAccountForUser(
  userId: string
): Promise<DeleteAccountResult> {
  try {
    await persistDel(userProfileKey(userId));
    await persistDel(userIntelligenceSnapshotKey(userId));
  } catch (err) {
    console.error(
      "[DELETE_ACCOUNT] persistence_failed",
      userId,
      err instanceof Error ? err.message : err
    );
    return {
      ok: false,
      stage: "persistence",
      error: "Failed to delete stored profile data",
    };
  }

  try {
    const client = await clerkClient();
    await client.users.deleteUser(userId);
    return { ok: true };
  } catch (err) {
    console.error(
      "[DELETE_ACCOUNT] clerk_failed",
      userId,
      err instanceof Error ? err.message : err
    );
    return {
      ok: false,
      stage: "clerk",
      error: "Failed to delete authentication account",
    };
  }
}
