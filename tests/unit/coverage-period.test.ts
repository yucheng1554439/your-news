import { describe, expect, it } from "vitest";
import {
  deriveCoveragePeriodLabel,
  isSameUtcCalendarDay,
  startOfUtcDay,
} from "@/lib/briefing/shared/coverage-period";
import type { Story } from "@/lib/types";

function story(publishedAt: string): Story {
  return {
    slug: "test",
    headline: "Test",
    summary: "Summary",
    source: "Test Source",
    category: "technology",
    publishedAt,
    tags: [],
    importance: 5,
    imageUrl: "",
    readTime: 3,
    whyItMatters: "",
  };
}

describe("deriveCoveragePeriodLabel", () => {
  it("uses newest story day for daily cadence", () => {
    const result = deriveCoveragePeriodLabel(
      [
        story("2026-06-03T10:00:00.000Z"),
        story("2026-06-04T14:00:00.000Z"),
      ],
      "daily"
    );
    expect(result.coverageDateMs).toBe(startOfUtcDay(Date.parse("2026-06-04T14:00:00.000Z")));
    expect(result.label).toMatch(/Jun 4/);
  });

  it("returns range for weekly cadence", () => {
    const result = deriveCoveragePeriodLabel(
      [
        story("2026-06-01T10:00:00.000Z"),
        story("2026-06-07T10:00:00.000Z"),
      ],
      "weekly"
    );
    expect(result.label).toContain("–");
  });
});

describe("isSameUtcCalendarDay", () => {
  it("matches same UTC day", () => {
    expect(
      isSameUtcCalendarDay(
        Date.parse("2026-06-04T08:00:00.000Z"),
        Date.parse("2026-06-04T22:00:00.000Z")
      )
    ).toBe(true);
  });
});
