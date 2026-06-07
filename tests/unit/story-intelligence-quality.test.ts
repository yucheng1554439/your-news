import { describe, expect, it } from "vitest";
import {
  buildMetadataBriefing,
  stripArticleArtifacts,
} from "@/lib/intelligence/story-intelligence-quality";
import type { Story } from "@/lib/types";

const baseStory: Story = {
  slug: "broadcom-forecast",
  headline: "Broadcom delivers disappointing AI revenue forecast",
  summary: "Broadcom cut guidance amid mixed hyperscaler demand.",
  source: "Reuters",
  category: "technology",
  publishedAt: "2026-06-04T12:00:00.000Z",
  tags: ["ai", "semiconductors"],
  importance: 7,
  imageUrl: "",
  readTime: 4,
  whyItMatters: "",
};

describe("stripArticleArtifacts", () => {
  it("removes bylines and newsletter footer phrases", () => {
    const cleaned = stripArticleArtifacts(
      "Revenue missed expectations by Sean Hollister. Subscribe to our newsletter for more."
    );
    expect(cleaned.toLowerCase()).not.toContain("sean hollister");
    expect(cleaned.toLowerCase()).not.toContain("subscribe");
  });
});

describe("buildMetadataBriefing", () => {
  it("builds headline-led briefing without pasting raw excerpt", () => {
    const text = buildMetadataBriefing(baseStory);
    expect(text).toContain("Broadcom");
    expect(text).toContain("Reuters");
    expect(text.length).toBeGreaterThan(40);
  });
});
