import { describe, expect, it } from "vitest";
import {
  PERSIST_KEYS,
  userIntelligenceSnapshotKey,
  userProfileKey,
} from "@/lib/persistence/keys";

describe("persistence keys", () => {
  it("sanitizes userId in profile key", () => {
    const key = userProfileKey("user/with/special chars!");
    expect(key).toMatch(/^yn:v2:user-profile:user_with_special_chars_/);
    expect(key).not.toContain("/");
  });

  it("produces distinct keys per user", () => {
    expect(userProfileKey("user_a")).not.toBe(userProfileKey("user_b"));
    expect(userIntelligenceSnapshotKey("user_a")).not.toBe(
      userIntelligenceSnapshotKey("user_b")
    );
  });

  it("exposes stable global key names", () => {
    expect(PERSIST_KEYS.storyPool).toBe("yn:v1:story-pool");
    expect(PERSIST_KEYS.intelligenceSnapshot).toBe(
      "yn:v2:intelligence-snapshot"
    );
  });
});
