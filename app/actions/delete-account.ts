"use server";

import { auth } from "@clerk/nextjs/server";
import { deleteAccountForUser } from "@/lib/services/delete-account";

export type DeleteAccountActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteAccountAction(): Promise<DeleteAccountActionResult> {
  const session = await auth();
  if (!session.userId) {
    return { ok: false, error: "Not signed in" };
  }

  const result = await deleteAccountForUser(session.userId);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true };
}
