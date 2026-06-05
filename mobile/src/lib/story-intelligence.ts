import type { OnboardingProfile, Story } from "@/types";

export const STORY_INTEL_SECTION_TITLES = {
  briefing: "The Briefing",
  whyItMatters: "Why It Matters",
  whyItMattersToYou: "Why This Matters To You",
  whatToWatch: "What To Watch",
} as const;

const NO_DIRECT_IMPACT =
  /\bno direct impact detected\b/i;

const PLACEHOLDER_WATCH =
  /\bwatch (?:for )?(?:the )?next\s+(?:markets?|geopolitics?|technology|business)\s+development\b/i;

const GENERIC_WATCH =
  /\bwatch for follow-up reporting\b|\bofficial responses\b|\bconfirms or reverses the lead reporting\b/i;

const AUTHOR_BYLINE =
  /\bby\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g;

const CORPUS_ENTITY =
  /\b(nvidia|broadcom|openai|microsoft|google|amazon|meta|apple|tsmc|fed|opec|earnings|guidance|export.?control|computex|blackwell)\b/i;

export type StoryIntelSection = {
  title: string;
  body: string;
  isFallback?: boolean;
  disclaimer?: string;
  highlight?: boolean;
};

export type ResolvedStoryIntelligence = {
  briefing: StoryIntelSection;
  whyItMatters: StoryIntelSection;
  whyItMattersToYou: StoryIntelSection;
  whatToWatch: StoryIntelSection;
};

function stripArtifacts(text: string): string {
  return text
    .replace(AUTHOR_BYLINE, " ")
    .replace(/\bsubscribe to\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string): number {
  const stop = new Set([
    "the",
    "a",
    "an",
    "for",
    "you",
    "your",
    "this",
    "that",
    "and",
    "or",
    "to",
    "of",
    "in",
    "on",
    "is",
    "are",
    "with",
    "from",
    "as",
    "at",
    "by",
    "it",
  ]);
  const ta = new Set(
    normalize(a)
      .split(" ")
      .filter((w) => w.length > 2 && !stop.has(w))
  );
  const tb = new Set(
    normalize(b)
      .split(" ")
      .filter((w) => w.length > 2 && !stop.has(w))
  );
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  return union ? inter / union : 0;
}

function tooSimilar(a: string, b: string, threshold = 0.7): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  return similarity(a, b) >= threshold;
}

function entitiesFromStory(story: Story): string[] {
  const blob = `${story.headline} ${story.summary} ${story.tags?.join(" ") ?? ""}`;
  const found = new Set<string>();
  for (const m of blob.matchAll(CORPUS_ENTITY)) {
    if (m[0]) found.add(m[0].toLowerCase());
  }
  return [...found];
}

function metadataBriefing(story: Story): string {
  const headline = story.headline.trim();
  const source = story.source.trim();
  const entities = entitiesFromStory(story);
  const entityClause =
    entities.length > 0
      ? ` Coverage centers on ${entities.slice(0, 3).join(", ")}.`
      : "";
  return stripArtifacts(
    `${headline}. Reported via ${source}.${entityClause} Additional detail may arrive as outlets publish follow-ups.`
  );
}

function metadataWhy(story: Story): string {
  const entities = entitiesFromStory(story);
  const entityClause =
    entities.length > 0
      ? ` Pay special attention to implications for ${entities.slice(0, 3).join(", ")}.`
      : "";
  return stripArtifacts(
    `If the reporting holds, this may shift roadmaps, capital allocation, and vendor decisions.${entityClause} Treat single-outlet claims as provisional until corroboration lands.`
  );
}

function metadataWhyYou(story: Story, profile?: OnboardingProfile | null): string {
  const interests =
    profile?.interests?.length
      ? profile.interests.join(" and ")
      : "your focus areas";
  const career = profile?.career ?? "professional";
  const entities = entitiesFromStory(story);
  const entityClause = entities.length
    ? ` with ${entities[0]} in the headline`
    : "";
  return stripArtifacts(
    `As a ${career} focused on ${interests}, decide whether this changes a decision you own${entityClause}. The consequence lane is infrastructure spend, product roadmaps, and policy risk.`
  );
}

function metadataWatch(story: Story): string {
  const headline = story.headline.toLowerCase();
  const entities = entitiesFromStory(story);
  if (/\bbroadcom\b/i.test(headline) || entities.includes("broadcom")) {
    return "Watch Broadcom AI revenue revisions, hyperscaler procurement signals, and the next earnings guidance print.";
  }
  if (/\bnvidia\b/i.test(headline) || entities.includes("nvidia")) {
    return "Watch Nvidia guidance, Blackwell shipment updates, and export-control announcements affecting advanced GPUs.";
  }
  if (/\bcomputex\b/i.test(headline)) {
    return "Watch Computex product launches from AMD, Intel, and Nvidia, plus Taiwan supply-chain and export-control headlines.";
  }
  if (entities.length > 0) {
    return `Watch ${entities.slice(0, 2).join(" and ")} earnings, guidance, product launches, and policy filings that confirm or reverse this thread.`;
  }
  return `Watch ${story.source} and tier-1 peers for official statements, filings, or earnings that add facts beyond the headline.`;
}

function isPlaceholderWatch(text: string): boolean {
  return (
    !text.trim() ||
    PLACEHOLDER_WATCH.test(text) ||
    (GENERIC_WATCH.test(text) && !CORPUS_ENTITY.test(text))
  );
}

function storyMatchesProfile(story: Story, profile: OnboardingProfile): boolean {
  const blob = `${story.headline} ${story.summary} ${story.tags?.join(" ") ?? ""}`.toLowerCase();
  for (const interest of profile.interests ?? []) {
    if (blob.includes(interest.toLowerCase())) return true;
  }
  if (profile.career === "engineer" && /\b(ai|gpu|semiconductor|software|infrastructure)\b/i.test(blob)) {
    return true;
  }
  return false;
}

export function resolveStoryIntelligence(
  story: Story,
  profile?: OnboardingProfile | null
): ResolvedStoryIntelligence {
  const isMetadataSignal =
    story.intelligenceGeneratedBy === "metadata" || story.paywallDetected;

  let briefingBody = stripArtifacts(story.summary?.trim() ?? "");
  let whyItMattersBody = stripArtifacts(story.whyItMatters?.trim() ?? "");
  let whyYouBody = stripArtifacts(story.whyItMattersToYou?.trim() ?? "");
  let watchBody = stripArtifacts(story.nextWatch?.trim() ?? "");

  if (!briefingBody || tooSimilar(briefingBody, story.rawExcerpt ?? "", 0.82)) {
    briefingBody = metadataBriefing(story);
  }
  if (
    !whyItMattersBody ||
    tooSimilar(briefingBody, whyItMattersBody) ||
    tooSimilar(whyItMattersBody, story.rawExcerpt ?? "", 0.82)
  ) {
    whyItMattersBody = metadataWhy(story);
  }
  if (
    !whyYouBody ||
    (profile && NO_DIRECT_IMPACT.test(whyYouBody) && storyMatchesProfile(story, profile))
  ) {
    whyYouBody = profile
      ? metadataWhyYou(story, profile)
      : "No direct impact detected for your current intelligence profile.";
  }
  if (!watchBody || isPlaceholderWatch(watchBody)) {
    watchBody = metadataWatch(story);
  }

  if (tooSimilar(briefingBody, whyItMattersBody)) {
    whyItMattersBody = metadataWhy(story);
  }

  return {
    briefing: {
      title: STORY_INTEL_SECTION_TITLES.briefing,
      body: briefingBody,
      isFallback: tooSimilar(briefingBody, story.summary ?? "", 0.85),
      disclaimer: isMetadataSignal
        ? story.signalSummaryDisclaimer ??
          "Analysis based on metadata and corroborating coverage."
        : undefined,
    },
    whyItMatters: {
      title: STORY_INTEL_SECTION_TITLES.whyItMatters,
      body: whyItMattersBody,
      isFallback: tooSimilar(briefingBody, whyItMattersBody),
    },
    whyItMattersToYou: {
      title: STORY_INTEL_SECTION_TITLES.whyItMattersToYou,
      body: whyYouBody,
      isFallback:
        !story.whyItMattersToYou?.trim() ||
        Boolean(profile && NO_DIRECT_IMPACT.test(whyYouBody) && storyMatchesProfile(story, profile)),
      highlight: true,
    },
    whatToWatch: {
      title: STORY_INTEL_SECTION_TITLES.whatToWatch,
      body: watchBody,
      isFallback: !story.nextWatch?.trim() || isPlaceholderWatch(story.nextWatch ?? ""),
    },
  };
}
