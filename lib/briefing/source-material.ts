import type { Story } from "@/lib/types";

export const MIN_STORY_MATERIAL_CHARS = 80;
export const MIN_DAILY_PROMPT_MATERIAL_CHARS = 160;

export function storySourceText(story: Story): string {
  if (story.paywallDetected) {
    return (
      story.rawExcerpt?.trim() ||
      story.summary?.trim() ||
      ""
    );
  }
  return (
    story.articleBody?.trim() ||
    story.rawExcerpt?.trim() ||
    story.summary?.trim() ||
    ""
  );
}

export function storyHasUsableMaterial(story: Story): boolean {
  return storySourceText(story).length >= MIN_STORY_MATERIAL_CHARS;
}

export function countSourceMaterial(stories: Story[]): {
  articleBodyCount: number;
  excerptOnlyCount: number;
  totalMaterialChars: number;
  usableStoryCount: number;
} {
  let articleBodyCount = 0;
  let excerptOnlyCount = 0;
  let totalMaterialChars = 0;
  let usableStoryCount = 0;

  for (const story of stories) {
    const text = storySourceText(story);
    const len = text.length;
    if (len >= MIN_STORY_MATERIAL_CHARS) {
      usableStoryCount += 1;
      totalMaterialChars += len;
    }
    if (story.articleBody && story.articleBody.length >= MIN_STORY_MATERIAL_CHARS) {
      articleBodyCount += 1;
    } else if (len >= MIN_STORY_MATERIAL_CHARS) {
      excerptOnlyCount += 1;
    }
  }

  return {
    articleBodyCount,
    excerptOnlyCount,
    totalMaterialChars,
    usableStoryCount,
  };
}

export function hasEnoughMaterialForBriefing(
  stories: Story[],
  cadence: "daily" | "weekly"
): boolean {
  if (stories.length === 0) return false;
  const { totalMaterialChars, usableStoryCount } = countSourceMaterial(stories);
  const minChars =
    cadence === "daily" ? MIN_DAILY_PROMPT_MATERIAL_CHARS : MIN_STORY_MATERIAL_CHARS;
  return usableStoryCount > 0 && totalMaterialChars >= minChars;
}
