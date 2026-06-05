import { sectionsTooSimilar } from "@/lib/briefing/shared/section-similarity";
import { extractCorroborationEntities } from "@/lib/feed/corroborating-coverage";
import { getCategoryLabel } from "@/lib/data/categories";
import { canGeneratePersonalizedSection } from "@/lib/intelligence/profile-context";
import type { StoryIntelligencePackage } from "@/lib/intelligence/types";
import type { OnboardingProfile, Story } from "@/lib/types";

const AUTHOR_BYLINE =
  /\bby\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}(?:\s*,\s*[A-Z][a-z]+)?\b/g;

const ARTIFACT_PATTERNS: RegExp[] = [
  AUTHOR_BYLINE,
  /\bsubscribe to\b/i,
  /\bsign up for\b/i,
  /\bread more\b/i,
  /\ball rights reserved\b/i,
  /\bnewsletter\b/i,
  /\bfollow us on\b/i,
  /\bshare this\b/i,
  /\bcourtesy of\b/i,
  /\bgetty images\b/i,
  /\bphoto:\s*/i,
  /\brepublished from\b/i,
  /\bsource:\s*reuters\b/i,
];

const PLACEHOLDER_WATCH =
  /\bwatch (?:for )?(?:the )?next\s+(?:markets?|geopolitics?|technology|business|world|general)\s+development\b/i;

const GENERIC_WATCH =
  /\bwatch for follow-up reporting\b|\bofficial responses\b|\bbroader adoption of this trend\b|\bconfirms or reverses the lead reporting\b/i;

const NO_DIRECT_IMPACT =
  /\bno direct impact detected\b/i;

const ENTITY_LABELS: Record<string, string> = {
  nvidia: "Nvidia",
  broadcom: "Broadcom",
  amd: "AMD",
  intel: "Intel",
  openai: "OpenAI",
  anthropic: "Anthropic",
  microsoft: "Microsoft",
  google: "Google",
  apple: "Apple",
  amazon: "Amazon",
  meta: "Meta",
  tsmc: "TSMC",
  fed: "the Fed",
  china: "China",
  ukraine: "Ukraine",
  opec: "OPEC",
};

export function stripArticleArtifacts(text: string): string {
  let out = text.replace(/\s+/g, " ").trim();
  for (const pattern of ARTIFACT_PATTERNS) {
    pattern.lastIndex = 0;
    out = out.replace(pattern, " ");
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

function formatEntityList(entities: string[]): string {
  const labels = entities
    .slice(0, 4)
    .map((id) => ENTITY_LABELS[id] ?? id.replace(/-/g, " "));
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0]!;
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

function storyEntities(story: Story): string[] {
  return extractCorroborationEntities(story);
}

function inferConsequenceDomain(story: Story): string {
  const tags = story.tags;
  if (tags.includes("markets") || tags.includes("investing")) {
    return "prices, earnings expectations, and market positioning";
  }
  if (tags.includes("policy") || tags.includes("geopolitics")) {
    return "regulatory timelines, trade routes, and government leverage";
  }
  if (tags.includes("ai") || tags.includes("semiconductors")) {
    return "compute supply, product roadmaps, and infrastructure capex";
  }
  if (tags.includes("energy")) {
    return "power costs, commodity supply, and industrial capex";
  }
  if (tags.includes("cybersecurity")) {
    return "incident response spend, vendor trust, and compliance deadlines";
  }
  return `how ${getCategoryLabel(story.category).toLowerCase()} players adjust plans`;
}

export function looksLikeArticleExcerpt(text: string, story: Story): boolean {
  const t = stripArticleArtifacts(text);
  const excerpt = stripArticleArtifacts(
    (story.rawExcerpt ?? story.summary ?? "").trim()
  );
  if (!t || !excerpt) return false;
  if (sectionsTooSimilar(t, excerpt, 0.82)) return true;
  if (excerpt.length > 80 && t.length > 60 && excerpt.includes(t.slice(0, 48))) {
    return true;
  }
  return AUTHOR_BYLINE.test(text);
}

export function isPlaceholderWatch(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (PLACEHOLDER_WATCH.test(t)) return true;
  if (GENERIC_WATCH.test(t) && !/\b(nvidia|broadcom|earnings|guidance|export|cpi|fed|opec)\b/i.test(t)) {
    return true;
  }
  return false;
}

export function storyMatchesReaderFocus(
  story: Story,
  profile: OnboardingProfile
): boolean {
  const blob = `${story.headline} ${story.summary} ${story.tags.join(" ")} ${story.category}`.toLowerCase();
  for (const interest of profile.interests) {
    const term = interest.trim().toLowerCase();
    if (term.length >= 3 && blob.includes(term)) return true;
  }
  for (const id of profile.topicPreferences?.moreOf ?? []) {
    const term = id.replace(/-/g, " ").toLowerCase();
    if (term.length >= 3 && blob.includes(term)) return true;
  }
  if (profile.career === "engineer") {
    if (/\b(ai|gpu|semiconductor|software|infrastructure|cloud|data center)\b/i.test(blob)) {
      return true;
    }
  }
  if (profile.career === "investor" && story.tags.includes("markets")) return true;
  return false;
}

export function isWrongNoDirectImpact(
  text: string,
  story: Story,
  profile: OnboardingProfile | null
): boolean {
  if (!NO_DIRECT_IMPACT.test(text)) return false;
  if (!profile || !canGeneratePersonalizedSection(profile)) return false;
  return storyMatchesReaderFocus(story, profile);
}

export function buildMetadataBriefing(story: Story): string {
  const headline = story.headline.trim();
  const source = story.source.trim();
  const entities = formatEntityList(storyEntities(story));
  const entityClause = entities
    ? ` Coverage centers on ${entities}.`
    : "";
  return stripArticleArtifacts(
    `${headline}. Reported via ${source}.${entityClause} Additional detail may arrive as outlets publish follow-ups.`
  ).slice(0, 400);
}

export function buildMetadataWhyItMatters(story: Story): string {
  const domain = inferConsequenceDomain(story);
  const entities = formatEntityList(storyEntities(story));
  const entityClause = entities
    ? ` Pay special attention to implications for ${entities}.`
    : "";
  return stripArticleArtifacts(
    `If the reporting holds, the consequence lane is ${domain}.${entityClause} Treat single-outlet claims as provisional until tier-1 corroboration lands.`
  ).slice(0, 480);
}

export function buildMetadataPersonalizedWhy(
  story: Story,
  profile: OnboardingProfile
): string {
  const career = profile.career ?? "professional";
  const interests =
    profile.interests.length > 0
      ? profile.interests.join(" and ")
      : "your focus areas";
  const domain = inferConsequenceDomain(story);
  const entities = formatEntityList(storyEntities(story));
  const entityClause = entities ? ` with ${entities} in the headline` : "";

  const careerHook: Record<NonNullable<OnboardingProfile["career"]>, string> = {
    investor: `For your portfolio lens on ${interests}, decide whether exposure${entityClause} needs resizing before the next earnings or macro print.`,
    engineer: `For your engineering work on ${interests}, decide whether roadmap, vendors, or hiring assumptions${entityClause} need updating this sprint.`,
    founder: `For your company in ${interests}, decide whether pitch, pricing, or GTM sequencing${entityClause} needs a refresh.`,
    executive: `For your org focused on ${interests}, assign an owner to quantify operating and vendor exposure${entityClause} within the week.`,
    researcher: `For your research on ${interests}, queue primary-source checks on claims${entityClause} before citing them externally.`,
  };

  const line = profile.career
    ? careerHook[profile.career]
    : `Given your focus on ${interests}, map how this changes a decision you own.`;

  return stripArticleArtifacts(
    `As a ${career}, ${line} The practical consequence lane is ${domain}.`
  ).slice(0, 520);
}

export function buildMetadataWhatToWatch(story: Story): string {
  const entities = storyEntities(story);
  const label = formatEntityList(entities);
  const headline = story.headline.toLowerCase();

  if (/\bbroadcom\b/i.test(headline) || entities.includes("broadcom")) {
    return "Watch Broadcom AI revenue revisions, hyperscaler procurement signals, and the next earnings guidance print.";
  }
  if (/\bnvidia\b/i.test(headline) || entities.includes("nvidia")) {
    return "Watch Nvidia guidance, Blackwell shipment updates, and export-control announcements affecting advanced GPUs.";
  }
  if (/\bcomputex\b/i.test(headline)) {
    return "Watch Computex product launches from AMD, Intel, and Nvidia, plus Taiwan supply-chain and export-control headlines.";
  }
  if (entities.includes("fed") || /\b(rate|inflation|cpi)\b/i.test(headline)) {
    return "Watch CPI/PCE prints, Fed minutes, and Treasury yield moves that reprice risk assets.";
  }
  if (label) {
    return `Watch ${label} earnings, guidance, product launches, and policy filings that confirm or reverse this thread.`;
  }
  return `Watch ${story.source} and tier-1 peers for official statements, filings, or earnings that add facts beyond the headline.`;
}

function needsRepair(
  briefing: string,
  why: string,
  whyYou: string | undefined,
  watch: string | undefined,
  story: Story,
  profile: OnboardingProfile | null
): boolean {
  if (!briefing || !why) return true;
  if (sectionsTooSimilar(briefing, why, 0.7)) return true;
  if (looksLikeArticleExcerpt(briefing, story) && story.intelligenceGeneratedBy !== "metadata") {
    return true;
  }
  if (looksLikeArticleExcerpt(why, story)) return true;
  if (watch && isPlaceholderWatch(watch)) return true;
  if (
    whyYou &&
    profile &&
    isWrongNoDirectImpact(whyYou, story, profile)
  ) {
    return true;
  }
  return false;
}

/** Enforce distinct, non-article intelligence sections before persistence or display. */
export function repairStoryIntelligencePackage(
  story: Story,
  pkg: StoryIntelligencePackage,
  profile: OnboardingProfile | null = null
): StoryIntelligencePackage {
  let theBriefing = stripArticleArtifacts(pkg.theBriefing?.trim() ?? "");
  let whyItMatters = stripArticleArtifacts(pkg.whyItMatters?.trim() ?? "");
  let whyItMattersToYou = pkg.whyItMattersToYou?.trim()
    ? stripArticleArtifacts(pkg.whyItMattersToYou.trim())
    : undefined;
  let nextWatch = pkg.nextWatch?.trim()
    ? stripArticleArtifacts(pkg.nextWatch.trim())
    : undefined;

  if (
    !needsRepair(
      theBriefing,
      whyItMatters,
      whyItMattersToYou,
      nextWatch,
      story,
      profile
    )
  ) {
    return {
      ...pkg,
      theBriefing,
      whyItMatters,
      whyItMattersToYou,
      nextWatch,
    };
  }

  const useMetadataBriefing =
    !theBriefing ||
    looksLikeArticleExcerpt(theBriefing, story) ||
    sectionsTooSimilar(theBriefing, whyItMatters, 0.7);

  if (useMetadataBriefing) {
    theBriefing = buildMetadataBriefing(story);
  }

  if (
    !whyItMatters ||
    sectionsTooSimilar(theBriefing, whyItMatters, 0.7) ||
    looksLikeArticleExcerpt(whyItMatters, story)
  ) {
    whyItMatters = buildMetadataWhyItMatters(story);
  }

  if (
    profile &&
    canGeneratePersonalizedSection(profile) &&
    (!whyItMattersToYou ||
      isWrongNoDirectImpact(whyItMattersToYou, story, profile) ||
      sectionsTooSimilar(whyItMatters, whyItMattersToYou, 0.7))
  ) {
    whyItMattersToYou = buildMetadataPersonalizedWhy(story, profile);
  }

  if (!nextWatch || isPlaceholderWatch(nextWatch)) {
    nextWatch = buildMetadataWhatToWatch(story);
  }

  if (sectionsTooSimilar(theBriefing, whyItMatters, 0.7)) {
    whyItMatters = buildMetadataWhyItMatters(story);
  }

  return {
    ...pkg,
    theBriefing,
    whyItMatters,
    whyItMattersToYou,
    nextWatch,
    generatedBy:
      pkg.generatedBy === "openai" || pkg.generatedBy === "anthropic"
        ? pkg.generatedBy
        : pkg.generatedBy ?? "fallback",
  };
}
