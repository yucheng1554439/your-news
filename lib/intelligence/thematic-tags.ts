import type { StoryCategory } from "@/lib/types";

/** Granular domains for ranking and personalization (not broad "technology"). */
export type ThematicTag =
  | "ai"
  | "ai-infrastructure"
  | "consumer-ai"
  | "enterprise-ai"
  | "open-source-ai"
  | "semiconductors"
  | "cloud-infrastructure"
  | "developer-tools"
  | "robotics"
  | "gaming"
  | "consumer-tech"
  | "markets"
  | "investing"
  | "startups"
  | "geopolitics"
  | "energy"
  | "cybersecurity"
  | "infrastructure"
  | "policy"
  | "science"
  | "sports"
  | "supply-chain";

type TagRule = { tag: ThematicTag; pattern: RegExp };

const RULES: TagRule[] = [
  {
    tag: "gaming",
    pattern:
      /\b(video game|gaming|playstation|xbox|nintendo|fortnite|esports|game studio|game release)\b/i,
  },
  {
    tag: "ai-infrastructure",
    pattern:
      /\b(data center|hyperscaler|training cluster|gpu cluster|inference at scale|cloud capex|power for ai)\b/i,
  },
  {
    tag: "consumer-ai",
    pattern:
      /\b(chatgpt app|copilot|ai assistant|ai feature|iphone ai|consumer ai|gemini app)\b/i,
  },
  {
    tag: "enterprise-ai",
    pattern:
      /\b(enterprise ai|copilot for|workplace ai|b2b ai|saas ai|corporate ai deployment)\b/i,
  },
  {
    tag: "open-source-ai",
    pattern:
      /\b(open.?source model|llama\b|mistral|hugging face|model weights released)\b/i,
  },
  {
    tag: "robotics",
    pattern: /\b(robotics|humanoid robot|autonomous robot|warehouse robot)\b/i,
  },
  {
    tag: "developer-tools",
    pattern:
      /\b(developer tool|vscode|github|api sdk|programming language|framework release|devops)\b/i,
  },
  {
    tag: "cloud-infrastructure",
    pattern:
      /\b(aws\b|azure\b|google cloud|kubernetes|cloud region|saas infrastructure)\b/i,
  },
  {
    tag: "ai",
    pattern:
      /\b(\bai\b|artificial intelligence|llm|openai|anthropic|generative|machine learning|gpt)\b/i,
  },
  {
    tag: "semiconductors",
    pattern: /\b(nvidia|amd|intel|tsmc|chip|semiconductor|gpu|hbm|foundry)\b/i,
  },
  {
    tag: "markets",
    pattern:
      /\b(market|stock|s&p|nasdaq|dow|fed|inflation|gdp|treasury|bond|commodity)\b/i,
  },
  {
    tag: "investing",
    pattern:
      /\b(investor|portfolio|valuation|earnings|ipo|hedge fund|private equity|shareholder)\b/i,
  },
  {
    tag: "startups",
    pattern: /\b(startup|venture|series [a-d]|founder|unicorn|seed round)\b/i,
  },
  {
    tag: "geopolitics",
    pattern:
      /\b(war|geopolit|china|taiwan|nato|military|sanction|diplomat|ukraine|israel|conflict)\b/i,
  },
  {
    tag: "energy",
    pattern:
      /\b(oil|natural gas|lng|solar|wind power|renewable|opec|crude|nuclear energy|grid)\b/i,
  },
  {
    tag: "cybersecurity",
    pattern:
      /\b(cyber|ransomware|breach|hack|zero-day|malware|attack surface|cve)\b/i,
  },
  {
    tag: "infrastructure",
    pattern: /\b(infrastructure|fiber network|5g network|submarine cable)\b/i,
  },
  {
    tag: "policy",
    pattern:
      /\b(regulation|antitrust|congress|legislation|sec\b|ftc|doj|eu commission|compliance)\b/i,
  },
  {
    tag: "consumer-tech",
    pattern: /\b(apple|iphone|android|meta|tiktok|streaming service|app store)\b/i,
  },
  {
    tag: "science",
    pattern:
      /\b(research|study|nasa|space|genome|physics|biology|clinical trial|laboratory)\b/i,
  },
  {
    tag: "policy",
    pattern:
      /\b(healthcare|hospital|fda|drug approval|pharma|medicare|medicaid|public health)\b/i,
  },
  {
    tag: "sports",
    pattern:
      /\b(nfl|nba|mlb|nhl|soccer|olympics|championship|playoffs|athlete|coach)\b/i,
  },
  {
    tag: "supply-chain",
    pattern:
      /\b(supply chain|logistics|shipping|tariff|export control|manufacturing)\b/i,
  },
];

const CATEGORY_TO_TAG: Partial<Record<StoryCategory, ThematicTag>> = {
  ai: "ai",
  technology: "consumer-tech",
  developer: "developer-tools",
  markets: "markets",
  energy: "energy",
  geopolitics: "geopolitics",
  cybersecurity: "cybersecurity",
  startups: "startups",
  policy: "policy",
};

export function inferThematicTags(
  headline: string,
  excerpt: string,
  primaryCategory: StoryCategory
): string[] {
  const blob = `${headline} ${excerpt}`;
  const tags = new Set<string>();

  const primaryTag = CATEGORY_TO_TAG[primaryCategory];
  if (primaryTag) tags.add(primaryTag);
  tags.add(primaryCategory);

  for (const { tag, pattern } of RULES) {
    if (pattern.test(blob)) tags.add(tag);
  }

  if (tags.has("gaming") && !tags.has("investing") && !tags.has("markets")) {
    tags.delete("ai");
    tags.delete("ai-infrastructure");
  }

  return [...tags];
}

export function storyMatchesThematicTag(
  story: { tags: string[]; category: StoryCategory },
  tag: string
): boolean {
  return story.tags.includes(tag) || story.category === tag;
}

/** Interest id → granular tags for personalization. */
export const INTEREST_TO_TAGS: Record<string, ThematicTag[]> = {
  ai: [
    "ai",
    "ai-infrastructure",
    "consumer-ai",
    "enterprise-ai",
    "open-source-ai",
    "semiconductors",
  ],
  markets: ["markets", "investing", "semiconductors", "energy"],
  energy: ["energy", "infrastructure", "supply-chain"],
  geopolitics: ["geopolitics", "policy", "supply-chain"],
  cybersecurity: ["cybersecurity", "infrastructure", "enterprise-ai"],
  startups: ["startups", "investing", "enterprise-ai"],
  policy: ["policy", "geopolitics"],
  developer: [
    "developer-tools",
    "open-source-ai",
    "cloud-infrastructure",
    "ai-infrastructure",
  ],
};
