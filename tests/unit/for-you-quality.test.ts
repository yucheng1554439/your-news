import { describe, expect, it } from "vitest";
import {
  isGenericForYouAction,
  isGenericForYouWatch,
} from "@/lib/briefing/shared/for-you-corpus-narratives";
import { isForbiddenGenericForYouTitle } from "@/lib/briefing/shared/for-you-corpus-signals";

describe("For You quality gates", () => {
  it("rejects generic titles", () => {
    expect(
      isForbiddenGenericForYouTitle("A Strategic Pattern Emerged Across The Week")
    ).toBe(true);
    expect(
      isForbiddenGenericForYouTitle("AI Infrastructure Spending Meets Geopolitical Risk")
    ).toBe(false);
  });

  it("rejects placeholder watch text", () => {
    expect(isGenericForYouWatch("Watch for tier-1 follow-up reporting")).toBe(
      true
    );
    expect(
      isGenericForYouWatch(
        "Watch Broadcom AI revenue revisions and the next earnings guidance print."
      )
    ).toBe(false);
  });

  it("rejects template action text", () => {
    expect(
      isGenericForYouAction("Evaluate vendor and infrastructure commitments")
    ).toBe(true);
    expect(
      isGenericForYouAction(
        "Given Broadcom guidance miss, pause GPU vendor contracts until export-control rules clarify."
      )
    ).toBe(false);
  });
});
