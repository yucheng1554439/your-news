import type { Story, StoryCategory } from "@/types";

export type TopStoryCategory =
  | "all"
  | "ai"
  | "markets"
  | "geopolitics"
  | "energy"
  | "cybersecurity"
  | "science"
  | "sports";

export const TOP_STORY_CATEGORIES: { id: TopStoryCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ai", label: "AI" },
  { id: "markets", label: "Markets" },
  { id: "geopolitics", label: "Geopolitics" },
  { id: "energy", label: "Energy" },
  { id: "cybersecurity", label: "Cyber" },
  { id: "science", label: "Science" },
  { id: "sports", label: "Sports" },
];

const AI_TAGS = [
  "ai",
  "ai-infrastructure",
  "enterprise-ai",
  "semiconductors",
  "open-source-ai",
];
const AI_CATS: StoryCategory[] = ["ai", "technology", "developer", "startups"];

function matchesTag(story: Story, tag: string): boolean {
  const n = tag.toLowerCase();
  return (
    story.tags.some((t) => t.toLowerCase() === n) ||
    (story.strategicTags ?? []).some((t) => t.toLowerCase() === n) ||
    story.category === n
  );
}

export function filterStoriesByCategory(
  stories: Story[],
  category: TopStoryCategory
): Story[] {
  if (category === "all") return stories;

  return stories.filter((story) => {
    switch (category) {
      case "ai":
        return (
          AI_CATS.includes(story.category) ||
          AI_TAGS.some((t) => matchesTag(story, t))
        );
      case "markets":
        return (
          story.category === "markets" ||
          matchesTag(story, "markets") ||
          matchesTag(story, "investing")
        );
      case "geopolitics":
        return (
          story.category === "geopolitics" ||
          story.category === "policy" ||
          matchesTag(story, "geopolitics")
        );
      case "energy":
        return story.category === "energy" || matchesTag(story, "energy");
      case "cybersecurity":
        return (
          story.category === "cybersecurity" ||
          matchesTag(story, "cybersecurity")
        );
      case "science":
        return matchesTag(story, "science");
      case "sports":
        return matchesTag(story, "sports");
      default:
        return true;
    }
  });
}
