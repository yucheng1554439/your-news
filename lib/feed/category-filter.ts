import { storyMatchesTag } from "@/lib/intelligence/story-tags";
import { storyMatchesThematicTag } from "@/lib/intelligence/thematic-tags";
import { isNoiseStory } from "@/lib/signal/strategic-score";
import type { Story, StoryCategory } from "@/lib/types";

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
  { id: "cybersecurity", label: "Cybersecurity" },
  { id: "science", label: "Science" },
  { id: "sports", label: "Sports" },
];

const AI_TAGS = [
  "ai",
  "ai-infrastructure",
  "consumer-ai",
  "enterprise-ai",
  "open-source-ai",
  "semiconductors",
  "cloud-infrastructure",
  "developer-tools",
];
const AI_CATEGORIES: StoryCategory[] = ["ai", "technology", "developer", "startups"];
const MARKETS_TAGS = ["markets", "investing", "semiconductors"];
const GEOPOLITICS_CATEGORIES: StoryCategory[] = ["geopolitics", "policy"];
const GEOPOLITICS_TAGS = ["geopolitics", "policy", "supply-chain"];

const SPORTS_PATTERN =
  /\b(nfl|nba|mlb|nhl|soccer|football|basketball|baseball|olympics|championship|playoffs|tournament|athlete|coach|espn)\b/i;

function isSportsStory(story: Story): boolean {
  if (storyMatchesTag(story, "sports")) return true;
  const blob = `${story.headline} ${story.summary}`.toLowerCase();
  return SPORTS_PATTERN.test(blob) || story.source.toLowerCase().includes("espn");
}

function isScienceStory(story: Story): boolean {
  if (storyMatchesTag(story, "science")) return true;
  const blob = `${story.headline} ${story.summary}`.toLowerCase();
  return /\b(science|research|study|nasa|space|climate|lab|genome|physics|biology)\b/.test(
    blob
  );
}

function matchesAnyTag(story: Story, tags: string[]): boolean {
  return tags.some((t) => storyMatchesTag(story, t) || storyMatchesThematicTag(story, t));
}

export function filterStoriesByCategory(
  stories: Story[],
  category: TopStoryCategory
): Story[] {
  if (category === "all") {
    return stories.filter((s) => !isNoiseStory(s));
  }

  switch (category) {
    case "ai":
      return stories.filter(
        (s) =>
          (AI_CATEGORIES.includes(s.category) || matchesAnyTag(s, AI_TAGS)) &&
          !storyMatchesTag(s, "gaming")
      );
    case "markets":
      return stories.filter(
        (s) => s.category === "markets" || matchesAnyTag(s, MARKETS_TAGS)
      );
    case "geopolitics":
      return stories.filter(
        (s) =>
          GEOPOLITICS_CATEGORIES.includes(s.category) ||
          matchesAnyTag(s, GEOPOLITICS_TAGS)
      );
    case "energy":
      return stories.filter(
        (s) => s.category === "energy" || storyMatchesThematicTag(s, "energy")
      );
    case "cybersecurity":
      return stories.filter(
        (s) =>
          s.category === "cybersecurity" ||
          storyMatchesThematicTag(s, "cybersecurity")
      );
    case "science":
      return stories.filter(isScienceStory);
    case "sports":
      return stories.filter(isSportsStory);
    default:
      return stories;
  }
}
