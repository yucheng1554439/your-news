import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(),
}));

vi.mock("@/lib/persistence/kv-delete", () => ({
  persistDel: vi.fn().mockResolvedValue(true),
}));

import { clerkClient } from "@clerk/nextjs/server";
import { persistDel } from "@/lib/persistence/kv-delete";
import { deleteAccountForUser } from "@/lib/services/delete-account";
import {
  userIntelligenceSnapshotKey,
  userProfileKey,
} from "@/lib/persistence/keys";

describe("deleteAccountForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes persistence keys then Clerk user", async () => {
    const deleteUser = vi.fn().mockResolvedValue(undefined);
    vi.mocked(clerkClient).mockResolvedValue({
      users: { deleteUser },
    } as never);

    const result = await deleteAccountForUser("user_123");

    expect(result.ok).toBe(true);
    expect(persistDel).toHaveBeenCalledWith(userProfileKey("user_123"));
    expect(persistDel).toHaveBeenCalledWith(
      userIntelligenceSnapshotKey("user_123")
    );
    expect(deleteUser).toHaveBeenCalledWith("user_123");
  });

  it("returns error when Clerk deletion fails", async () => {
    vi.mocked(clerkClient).mockResolvedValue({
      users: {
        deleteUser: vi.fn().mockRejectedValue(new Error("clerk error")),
      },
    } as never);

    const result = await deleteAccountForUser("user_456");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("clerk");
    }
  });
});
