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

const AI_CATEGORIES: StoryCategory[] = ["ai", "technology", "developer", "startups"];
const GEOPOLITICS_CATEGORIES: StoryCategory[] = ["geopolitics", "policy"];
const SCIENCE_CATEGORIES: StoryCategory[] = ["energy", "technology", "ai"];

const SPORTS_PATTERN =
  /\b(nfl|nba|mlb|nhl|soccer|football|basketball|baseball|olympics|championship|playoffs|tournament|athlete|coach|espn)\b/i;

function isSportsStory(story: Story): boolean {
  if (story.tags.includes("sports")) return true;
  const blob = `${story.headline} ${story.summary}`.toLowerCase();
  return SPORTS_PATTERN.test(blob) || story.source.toLowerCase().includes("espn");
}

function isScienceStory(story: Story): boolean {
  if (story.tags.includes("science")) return true;
  if (SCIENCE_CATEGORIES.includes(story.category)) {
    const blob = `${story.headline} ${story.summary}`.toLowerCase();
    return /\b(science|research|study|nasa|space|climate|lab|genome|physics|biology)\b/.test(
      blob
    );
  }
  return false;
}

export function filterStoriesByCategory(
  stories: Story[],
  category: TopStoryCategory
): Story[] {
  if (category === "all") return stories;

  switch (category) {
    case "ai":
      return stories.filter((s) => AI_CATEGORIES.includes(s.category));
    case "markets":
      return stories.filter((s) => s.category === "markets");
    case "geopolitics":
      return stories.filter((s) => GEOPOLITICS_CATEGORIES.includes(s.category));
    case "energy":
      return stories.filter((s) => s.category === "energy");
    case "cybersecurity":
      return stories.filter((s) => s.category === "cybersecurity");
    case "science":
      return stories.filter(isScienceStory);
    case "sports":
      return stories.filter(isSportsStory);
    default:
      return stories;
  }
}
