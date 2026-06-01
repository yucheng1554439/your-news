import type { Story } from "@/lib/types";

export function hasDisplayableIntelligence(story: Story): boolean {
  const by = story.intelligenceGeneratedBy;
  if (
    by !== "anthropic" &&
    by !== "openai" &&
    by !== "fallback" &&
    by !== "metadata"
  ) {
    return false;
  }
  const hasCore =
    Boolean(story.summary?.trim()) && Boolean(story.whyItMatters?.trim());
  if (by === "metadata") {
    return hasCore;
  }
  return hasCore;
}

export function isEditorialTemplate(story: Story): boolean {
  return story.intelligenceGeneratedBy === "fallback";
}

export function isModelGeneratedIntelligence(story: Story): boolean {
  return (
    story.intelligenceGeneratedBy === "anthropic" ||
    story.intelligenceGeneratedBy === "openai"
  );
}
