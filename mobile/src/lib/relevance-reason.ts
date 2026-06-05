import type { Story } from "@/types";
import type { UserIntelligenceProfile } from "@/types";

export function relevanceReasonForStory(
  story: Story,
  intelligence: UserIntelligenceProfile | null,
  profileInterests: string[] = [],
  topicMore: string[] = []
): string | null {
  if (!intelligence) {
    return profileInterests.length > 0
      ? "Ranked for your stated interests and career focus."
      : null;
  }

  if (intelligence.savedSlugs.includes(story.slug)) {
    return "Because you saved this story or similar coverage.";
  }

  const tags = [
    ...(story.strategicTags ?? []),
    ...(story.tags ?? []),
    story.category,
  ].map((t) => t.toLowerCase());

  const morePrefs = [
    ...(intelligence.topicPreferencesMore ?? []),
    ...topicMore,
  ];
  for (const pref of morePrefs) {
    if (tags.some((t) => t.includes(pref.toLowerCase()))) {
      return "Because of your topic preference — more of this coverage.";
    }
  }

  for (const tag of intelligence.primaryTags ?? intelligence.topTags ?? []) {
    if (tags.some((t) => t.includes(tag.tag.toLowerCase()))) {
      return `Because you follow ${tag.label} in your intelligence profile.`;
    }
  }

  for (const theme of intelligence.primaryThemes ?? intelligence.topThemes ?? []) {
    const label = theme.label.toLowerCase();
    if (
      tags.some((t) => t.includes(label.split(" ")[0] ?? "")) ||
      story.headline.toLowerCase().includes(label.split(" ")[0] ?? "")
    ) {
      return `Because ${theme.label} is a primary theme in your profile.`;
    }
  }

  if (intelligence.openedSlugs?.includes(story.slug)) {
    return "Because you recently opened related coverage.";
  }

  if (intelligence.behaviorConfidence >= 0.35) {
    return `Aligned with your lens: ${intelligence.effectiveLens}.`;
  }

  return "Ranked for your career, interests, and editorial weight.";
}
