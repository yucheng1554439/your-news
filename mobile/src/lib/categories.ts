import type { StoryCategory } from "@/types";

const labels: Record<StoryCategory, string> = {
  ai: "AI & Technology",
  markets: "Markets",
  energy: "Energy",
  geopolitics: "Geopolitics",
  cybersecurity: "Cybersecurity",
  startups: "Startups",
  policy: "Policy",
  developer: "Developer",
  technology: "Technology",
};

export function getCategoryLabel(category: StoryCategory): string {
  return labels[category] ?? category;
}
