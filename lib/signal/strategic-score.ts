import type { Story, StoryCategory } from "@/lib/types";

export type SignalClass = "signal" | "noise";

/** 0 = noise, 1 = high strategic signal. */
export type StrategicAssessment = {
  strategicSignal: number;
  lowSignal: boolean;
  signalClass: SignalClass;
  reasons: string[];
};

const LOW_SIGNAL_PATTERN =
  /\b(gaming merch|merchandise|plush|collectible|toy\b|lego\b|funko|game trailer|season \d+ trailer|dlc\b|cosmetic|skin bundle|fortnite|call of duty|gta\b|black friday|cyber monday|coupon|discount code|giveaway|celebrity|kardashian|royal family|reality tv|box office|red carpet|fashion week|recipe\b|horoscope)\b/i;

const LOCAL_INCIDENT =
  /\b(local man|local woman|county sheriff|small town|car crash|house fire|shooting in|murder trial|missing person|school board|traffic stop|domestic dispute|neighborhood|suburb of)\b/i;

const ENTERTAINMENT_NOISE =
  /\b(morgan wallen|smashed a piano|smashed (his|her|the) piano|country star|pop star|rapper\b|singer\b|musician\b|concert tour|album release|music video|grammy|billboard|spotify playlist|hollywood|entertainment news|tv show|streaming series|movie premiere|film festival|award show|drama on set|feud with|breakup with|dating rumor|wedding photos|paparazzi)\b/i;

const CURIOSITY_NOISE =
  /\b(meteor sighting|meteor shower|shooting star|fireball in the sky|ufo sighting|strange lights in the sky|viral video|went viral|tiktok trend|meme\b|feel-good story|heartwarming moment|curiosity\b|oddity\b|bizarre moment|amazing video)\b/i;

const SPORTS_NOISE =
  /\b(nfl|nba|mlb|nhl|soccer score|football score|touchdown|home run|playoffs bracket|world cup final|super bowl|trade rumors?|draft pick|coach fired|player injury update)\b/i;

const CULTURE_EXPLAINER =
  /\b(eid al-adha|eid al-fitr|ramadan\b|hanukkah|diwali\b|holiday explainer|what is eid|cultural tradition|religious festival guide|holy month|festival guide)\b/i;

const GAMING_ENTERTAINMENT =
  /\b(video game|gaming|playstation|xbox|nintendo|esports|twitch streamer|gamer\b)/i;

const MEASURABLE_CONSEQUENCE =
  /\b(fed\b|federal reserve|interest rate|inflation|gdp|earnings|ipo\b|acquisition|merger|antitrust|sec charges|stock fell|stock rose|s&p|nasdaq|bond yield|treasury|recession|jobs report|congress|senate|white house|regulation|sanction|tariff|nato|ukraine|china|taiwan|war\b|missile|election|supreme court|g7|ceasefire|invasion|openai|anthropic|nvidia|tsmc|data center|hyperscaler|llm|semiconductor|cloud capex|ai infrastructure|export control|ai regulation|layoff|job cuts|opec|crude oil|natural gas|power grid|pipeline|supply chain|ransomware|data breach|cyber attack|defense spending|infrastructure bill|port\b|shipping lane|billion\b|\$\d)\b/i;

/** Stories that can plausibly affect decisions — Critical bar. */
export const CRITICAL_IMPACT_PATTERN =
  /\b(fed\b|federal reserve|fomc|interest rate (cut|hike|decision)|rate cut|rate hike|strait of hormuz|\biran\b|invasion|escalat|sanction|nvidia\b.*(\$|billion|investment|infrastructure|data center)|major ipo|\bipo\b.*(billion|largest)|ai regulation|export control|chip act|cybersecurity breach|data breach|ransomware attack|supply chain disrupt|energy supply|opec (cut|decision)|pipeline (attack|shut|rupture)|power grid (outage|attack)|critical infrastructure|defense spending|antitrust (ruling|suit)|treasury (sanction|tariff)|military strike|nuclear (program|facility)|semiconductor (shortage|ban)|war (on|in)|ceasefire|tariff (hike|war))\b/i;

const STRATEGIC_MARKET =
  /\b(fed\b|federal reserve|interest rate|inflation|gdp|earnings|ipo\b|acquisition|merger|antitrust|sec charges|stock fell|stock rose|s&p|nasdaq|bond yield|treasury|hedge fund|private equity|valuation|recession|jobs report)\b/i;

const STRATEGIC_POLICY_GEO =
  /\b(congress|senate|white house|regulation|sanction|tariff|nato|ukraine|china|taiwan|war\b|missile|election|ballot|supreme court|g7|un security|diplomat|ceasefire|invasion)\b/i;

const STRATEGIC_AI_TECH =
  /\b(openai|anthropic|nvidia|tsmc|data center|hyperscaler|llm|frontier model|chip export|semiconductor|cloud capex|ai infrastructure|training cluster|gpu\b|hbm\b)\b/i;

const STRATEGIC_ENTERPRISE =
  /\b(enterprise software|saas\b|b2b software|cloud spending|it budget|servicenow|workday|salesforce|developer tools|devtools|startup funding|venture capital|series [a-e]\b|semiconductor equipment)\b/i;

const STRATEGIC_LABOR =
  /\b(layoff|job cuts|hiring freeze|tech hiring|workforce|labor market|union\b|wage growth|headcount)\b/i;

const STRATEGIC_REGULATION =
  /\b(antitrust|fda\b|eu commission|export control|chip act|ai regulation|data privacy law)\b/i;

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

const HIGH_STAKES_CATEGORIES = new Set<StoryCategory>([
  "geopolitics",
  "policy",
  "markets",
  "energy",
  "cybersecurity",
]);

function storyBlob(story: Story): string {
  return `${story.headline} ${story.articleBody ?? story.rawExcerpt ?? story.summary}`;
}

function deriveSignalClass(
  lowSignal: boolean,
  strategic: number,
  blob: string
): SignalClass {
  if (lowSignal) return "noise";
  if (strategic < 0.22) return "noise";
  if (
    (ENTERTAINMENT_NOISE.test(blob) ||
      CURIOSITY_NOISE.test(blob) ||
      SPORTS_NOISE.test(blob)) &&
    !MEASURABLE_CONSEQUENCE.test(blob)
  ) {
    return "noise";
  }
  return "signal";
}

export function assessStrategicSignal(story: Story): StrategicAssessment {
  const blob = storyBlob(story);
  const reasons: string[] = [];

  if (LOW_SIGNAL_PATTERN.test(blob)) {
    return {
      strategicSignal: 0.08,
      lowSignal: true,
      signalClass: "noise",
      reasons: ["consumer/entertainment promo"],
    };
  }

  if (LOCAL_INCIDENT.test(blob) && !MEASURABLE_CONSEQUENCE.test(blob)) {
    return {
      strategicSignal: 0.09,
      lowSignal: true,
      signalClass: "noise",
      reasons: ["local incident without strategic consequence"],
    };
  }

  if (ENTERTAINMENT_NOISE.test(blob) && !MEASURABLE_CONSEQUENCE.test(blob)) {
    return {
      strategicSignal: 0.1,
      lowSignal: true,
      signalClass: "noise",
      reasons: ["entertainment/celebrity without strategic consequence"],
    };
  }

  if (CURIOSITY_NOISE.test(blob) && !MEASURABLE_CONSEQUENCE.test(blob)) {
    return {
      strategicSignal: 0.1,
      lowSignal: true,
      signalClass: "noise",
      reasons: ["curiosity/viral without strategic consequence"],
    };
  }

  if (SPORTS_NOISE.test(blob) && !MEASURABLE_CONSEQUENCE.test(blob)) {
    return {
      strategicSignal: 0.12,
      lowSignal: true,
      signalClass: "noise",
      reasons: ["sports coverage without business angle"],
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
      signalClass: "noise",
      reasons: ["culture/holiday explainer without macro linkage"],
    };
  }

  if (GAMING_ENTERTAINMENT.test(blob) && !STRATEGIC_AI_TECH.test(blob)) {
    const hasBizAngle = MEASURABLE_CONSEQUENCE.test(blob);
    if (!hasBizAngle) {
      return {
        strategicSignal: 0.18,
        lowSignal: true,
        signalClass: "noise",
        reasons: ["gaming/entertainment without business angle"],
      };
    }
  }

  let strategic = CATEGORY_FLOOR[story.category] ?? 0.24;

  if (STRATEGIC_MARKET.test(blob)) {
    strategic += 0.22;
    reasons.push("markets/capital");
  }
  if (STRATEGIC_POLICY_GEO.test(blob)) {
    strategic += 0.24;
    reasons.push("policy/geopolitics");
  }
  if (STRATEGIC_AI_TECH.test(blob)) {
    strategic += 0.26;
    reasons.push("ai/tech infrastructure");
  }
  if (STRATEGIC_ENTERPRISE.test(blob)) {
    strategic += 0.24;
    reasons.push("enterprise/startup capital");
  }
  if (STRATEGIC_LABOR.test(blob)) {
    strategic += 0.18;
    reasons.push("labor/hiring");
  }
  if (STRATEGIC_REGULATION.test(blob)) {
    strategic += 0.2;
    reasons.push("regulation");
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
  const signalClass = deriveSignalClass(lowSignal, capped, blob);

  return {
    strategicSignal: capped,
    lowSignal,
    signalClass,
    reasons,
  };
}

export function isLowSignalStory(story: Story): boolean {
  if (story.lowSignal === true) return true;
  if (story.signalClass === "noise") return true;
  return assessStrategicSignal(story).lowSignal;
}

export function isNoiseStory(story: Story): boolean {
  if (story.signalClass === "noise") return true;
  if (story.lowSignal === true) return true;
  return assessStrategicSignal(story).signalClass === "noise";
}

export function getStrategicSignal(story: Story): number {
  return story.strategicSignal ?? assessStrategicSignal(story).strategicSignal;
}

export function getSignalClass(story: Story): SignalClass {
  if (story.signalClass) return story.signalClass;
  return assessStrategicSignal(story).signalClass;
}

/** Briefings and hero slots — signal-only pool. */
export function isBriefingEligible(story: Story): boolean {
  if (isNoiseStory(story)) return false;
  return getStrategicSignal(story) >= 0.3;
}

/** Critical = rare; must plausibly affect decisions. */
export function meetsCriticalBar(story: Story): boolean {
  if (isNoiseStory(story)) return false;

  const strategic = getStrategicSignal(story);
  if (strategic < 0.5) return false;

  const blob = storyBlob(story);
  const hasCriticalMarker = CRITICAL_IMPACT_PATTERN.test(blob);
  const highStakes =
    HIGH_STAKES_CATEGORIES.has(story.category) && strategic >= 0.62;

  if (!hasCriticalMarker && !highStakes) return false;

  const clusterSize = story.clusterSize ?? 1;
  const corroboration = story.corroborationScore ?? 0;
  if (clusterSize < 2 && corroboration < 0.35 && strategic < 0.58) {
    return false;
  }

  return true;
}

/** @deprecated Use `@/lib/editorial/lead-eligibility` */
export { isLeadCandidate } from "@/lib/editorial/lead-eligibility";
