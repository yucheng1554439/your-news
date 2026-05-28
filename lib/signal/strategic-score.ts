import type { Story, StoryCategory } from "@/lib/types";

/** 0 = noise, 1 = high strategic signal. */
export type StrategicAssessment = {
  strategicSignal: number;
  lowSignal: boolean;
  reasons: string[];
};

const LOW_SIGNAL_PATTERN =
  /\b(gaming merch|merchandise|plush|collectible|toy\b|lego\b|funko|game trailer|season \d+ trailer|dlc\b|cosmetic|skin bundle|fortnite|call of duty|gta\b|black friday|cyber monday|coupon|discount code|giveaway|celebrity|kardashian|royal family|reality tv|box office|red carpet|fashion week|recipe\b|horoscope)\b/i;

const CULTURE_EXPLAINER =
  /\b(eid al-adha|eid al-fitr|ramadan\b|hanukkah|diwali\b|holiday explainer|what is eid|cultural tradition|religious festival guide|holy month|festival guide)\b/i;

const GAMING_ENTERTAINMENT =
  /\b(video game|gaming|playstation|xbox|nintendo|esports|twitch streamer|gamer\b)/i;

const SPORTS_ONLY =
  /\b(nfl|nba|mlb|nhl|soccer|football score|touchdown|home run|playoffs bracket)\b/i;

const STRATEGIC_MARKET =
  /\b(fed\b|federal reserve|interest rate|inflation|gdp|earnings|ipo\b|acquisition|merger|antitrust|sec charges|stock fell|stock rose|s&p|nasdaq|bond yield|treasury|hedge fund|private equity|valuation|recession|jobs report)\b/i;

const STRATEGIC_POLICY_GEO =
  /\b(congress|senate|white house|regulation|sanction|tariff|nato|ukraine|china|taiwan|war\b|missile|election|ballot|supreme court|g7|un security|diplomat|ceasefire|invasion)\b/i;

const STRATEGIC_AI_TECH =
  /\b(openai|anthropic|nvidia|tsmc|data center|hyperscaler|llm|frontier model|chip export|semiconductor|cloud capex|ai infrastructure|training cluster)\b/i;

const STRATEGIC_ENERGY =
  /\b(opec|crude oil|natural gas|lng\b|power grid|renewable|nuclear plant|pipeline|electricity price)\b/i;

const STRATEGIC_CYBER =
  /\b(ransomware|data breach|cyber attack|zero-day|critical vulnerability)\b/i;

const STRATEGIC_HEALTH =
  /\b(healthcare|hospital|fda|drug approval|pharma|medicare|public health|pandemic|clinical trial)\b/i;

const STRATEGIC_DEFENSE =
  /\b(pentagon|defense department|military aid|weapons|navy|army|air force|defense spending)\b/i;

const STRATEGIC_INFRA =
  /\b(infrastructure bill|highway|bridge|port|shipping lane|supply chain|logistics hub|broadband)\b/i;

const CATEGORY_FLOOR: Partial<Record<StoryCategory, number>> = {
  geopolitics: 0.38,
  policy: 0.36,
  markets: 0.36,
  energy: 0.34,
  cybersecurity: 0.32,
};

function storyBlob(story: Story): string {
  return `${story.headline} ${story.articleBody ?? story.rawExcerpt ?? story.summary}`;
}

export function assessStrategicSignal(story: Story): StrategicAssessment {
  const blob = storyBlob(story);
  const reasons: string[] = [];

  if (LOW_SIGNAL_PATTERN.test(blob)) {
    return {
      strategicSignal: 0.08,
      lowSignal: true,
      reasons: ["consumer/entertainment promo"],
    };
  }

  if (SPORTS_ONLY.test(blob) && story.tags.includes("sports")) {
    return {
      strategicSignal: 0.12,
      lowSignal: true,
      reasons: ["sports coverage"],
    };
  }

  if (
    CULTURE_EXPLAINER.test(blob) &&
    !STRATEGIC_MARKET.test(blob) &&
    !STRATEGIC_POLICY_GEO.test(blob)
  ) {
    return {
      strategicSignal: 0.14,
      lowSignal: true,
      reasons: ["culture/holiday explainer without macro linkage"],
    };
  }

  if (GAMING_ENTERTAINMENT.test(blob) && !STRATEGIC_AI_TECH.test(blob)) {
    const hasBizAngle =
      /\b(acquisition|billion|regulation|earnings|layoff|antitrust|stock)\b/i.test(
        blob
      );
    if (!hasBizAngle) {
      return {
        strategicSignal: 0.18,
        lowSignal: true,
        reasons: ["gaming/entertainment without business angle"],
      };
    }
  }

  let strategic = CATEGORY_FLOOR[story.category] ?? 0.24;

  if (STRATEGIC_MARKET.test(blob)) {
    strategic += 0.28;
    reasons.push("markets/capital");
  }
  if (STRATEGIC_POLICY_GEO.test(blob)) {
    strategic += 0.28;
    reasons.push("policy/geopolitics");
  }
  if (STRATEGIC_AI_TECH.test(blob)) {
    strategic += 0.22;
    reasons.push("ai/tech infrastructure");
  }
  if (STRATEGIC_ENERGY.test(blob)) {
    strategic += 0.22;
    reasons.push("energy");
  }
  if (STRATEGIC_CYBER.test(blob)) {
    strategic += 0.2;
    reasons.push("cybersecurity");
  }
  if (STRATEGIC_HEALTH.test(blob)) {
    strategic += 0.2;
    reasons.push("healthcare");
  }
  if (STRATEGIC_DEFENSE.test(blob)) {
    strategic += 0.22;
    reasons.push("defense");
  }
  if (STRATEGIC_INFRA.test(blob)) {
    strategic += 0.18;
    reasons.push("infrastructure");
  }

  if (story.tags.includes("semiconductors")) strategic += 0.1;
  if (story.tags.includes("policy")) strategic += 0.08;
  if (story.tags.includes("investing")) strategic += 0.08;
  if (story.tags.includes("geopolitics")) strategic += 0.08;

  const capped = Math.min(1, strategic);
  const lowSignal = false;

  return {
    strategicSignal: capped,
    lowSignal,
    reasons,
  };
}

export function isLowSignalStory(story: Story): boolean {
  if (story.lowSignal === true) return true;
  return assessStrategicSignal(story).lowSignal;
}

export function getStrategicSignal(story: Story): number {
  return story.strategicSignal ?? assessStrategicSignal(story).strategicSignal;
}

/** @deprecated Use `@/lib/editorial/lead-eligibility` */
export { isLeadCandidate } from "@/lib/editorial/lead-eligibility";
