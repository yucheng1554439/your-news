import type { Story } from "@/lib/types";

export type EntityRule = { id: string; label: string; pattern: RegExp };

/** Companies / topics surfaced as reader-specific entities. */
export const ENTITY_RULES: EntityRule[] = [
  { id: "nvidia", label: "Nvidia", pattern: /\bnvidia\b/i },
  { id: "tsmc", label: "TSMC", pattern: /\btsmc\b|\btaiwan semiconductor\b/i },
  { id: "amd", label: "AMD", pattern: /\bamd\b|\badvanced micro devices\b/i },
  { id: "intel", label: "Intel", pattern: /\bintel\b/i },
  { id: "openai", label: "OpenAI", pattern: /\bopenai\b/i },
  { id: "microsoft", label: "Microsoft", pattern: /\bmicrosoft\b/i },
  { id: "google", label: "Google", pattern: /\bgoogle\b|\balphabet\b/i },
  { id: "amazon", label: "Amazon", pattern: /\bamazon\b|\baws\b/i },
  { id: "meta", label: "Meta", pattern: /\bmeta platforms\b|\bfacebook\b/i },
  { id: "apple", label: "Apple", pattern: /\bapple\b/i },
  { id: "datacenter", label: "Datacenters", pattern: /\bdata\s*cent(er|re)\b/i },
  {
    id: "defense",
    label: "Defense",
    pattern:
      /\b(defense contractor|defense spending|pentagon|military contract|weapons system)\b/i,
  },
  {
    id: "oil",
    label: "Oil & Gas",
    pattern:
      /\b(crude oil|oil prices|oil supply|oil production|natural gas|opec|petroleum|oil and gas)\b/i,
  },
];

export function entitiesInStory(story: Story): string[] {
  const blob = `${story.headline} ${story.summary} ${story.tags.join(" ")}`;
  return ENTITY_RULES.filter((r) => {
    r.pattern.lastIndex = 0;
    return r.pattern.test(blob);
  }).map((r) => r.id);
}

export function entityLabel(id: string): string {
  return ENTITY_RULES.find((r) => r.id === id)?.label ?? id;
}
