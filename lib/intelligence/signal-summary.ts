import "server-only";

import { findCorroboratingStoriesForIntelligence, extractCorroborationEntities } from "@/lib/feed/corroborating-coverage";
import { PAYWALL_SIGNAL_DISCLAIMER, METADATA_SIGNAL_DISCLAIMER } from "@/lib/extraction/paywall";
import { getCategoryLabel } from "@/lib/data/categories";
import { canGeneratePersonalizedSection } from "@/lib/intelligence/profile-context";
import {
  buildMetadataBriefing,
  buildMetadataPersonalizedWhy,
  buildMetadataWhatToWatch,
  repairStoryIntelligencePackage,
} from "@/lib/intelligence/story-intelligence-quality";
import type { StoryIntelligencePackage } from "@/lib/intelligence/types";
import type { OnboardingProfile, Story } from "@/lib/types";

const ENTITY_LABELS: Record<string, string> = {
  nvidia: "Nvidia",
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

function metadataExcerpt(story: Story): string {
  return (story.rawExcerpt ?? story.summary).trim();
}

function firstSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : text.trim();
}

function inferConsequenceDomain(story: Story): string {
  const tags = story.tags;
  if (tags.includes("markets") || tags.includes("investing")) {
    return "prices, earnings expectations, and who gains or loses market share";
  }
  if (tags.includes("policy") || tags.includes("geopolitics")) {
    return "regulatory timelines, trade routes, and government leverage";
  }
  if (tags.includes("ai") || tags.includes("semiconductors")) {
    return "compute supply, product roadmaps, and who can ship faster";
  }
  if (tags.includes("energy")) {
    return "power costs, commodity supply, and industrial capex";
  }
  if (tags.includes("cybersecurity")) {
    return "incident response spend, vendor trust, and compliance deadlines";
  }
  return `how ${getCategoryLabel(story.category).toLowerCase()} players adjust plans and spending`;
}

function storyEntities(story: Story): string[] {
  return extractCorroborationEntities(story);
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

function corroboratingMaterial(story: Story): string {
  const excerpt = metadataExcerpt(story);
  if (excerpt.length >= 80) return excerpt;
  return story.summary.trim();
}

function uniqueOutlets(stories: Story[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const story of stories) {
    const name = story.source.trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    names.push(name);
  }
  return names;
}

function buildCorroborationSentence(
  anchor: Story,
  corroborating: Story[]
): string {
  const outlets = uniqueOutlets([anchor, ...corroborating]);
  if (outlets.length <= 1) return "";

  const listed =
    outlets.length <= 4
      ? outlets.join(", ")
      : `${outlets.slice(0, 3).join(", ")}, and ${outlets.length - 3} other outlets`;

  return `Corroborating coverage from ${listed} points to the same development.`;
}

function buildSupportingFacts(corroborating: Story[]): string[] {
  const facts: string[] = [];
  const seen = new Set<string>();

  for (const story of corroborating) {
    const material = corroboratingMaterial(story);
    const sentence = firstSentence(material);
    const key = sentence.toLowerCase().slice(0, 80);
    if (sentence.length < 40 || seen.has(key)) continue;
    seen.add(key);
    facts.push(`${story.source}: ${sentence}`);
    if (facts.length >= 2) break;
  }

  return facts;
}

export function buildSignalSummary(
  story: Story,
  corroborating: Story[]
): string {
  const parts: string[] = [buildMetadataBriefing(story)];

  const corroborationLine = buildCorroborationSentence(story, corroborating);
  if (corroborationLine) parts.push(corroborationLine);

  const supporting = buildSupportingFacts(corroborating);
  if (supporting.length > 0) {
    parts.push(supporting.join(" "));
  }

  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 680);
}

function buildSignalWhyItMatters(
  story: Story,
  corroborating: Story[],
  paywall: boolean
): string {
  const domain = inferConsequenceDomain(story);
  const entityLabel = formatEntityList(storyEntities(story));
  const outletCount = uniqueOutlets([story, ...corroborating]).length;

  const corroborationNote =
    outletCount >= 2
      ? `${outletCount} outlets are reporting the same thread. `
      : "";

  const focus = entityLabel
    ? `The practical angle is ${domain}, especially for ${entityLabel}.`
    : `The practical angle is ${domain}.`;

  const paywallNote = paywall
    ? " Full publisher text is unavailable — treat this as an early signal until primary sources confirm details."
    : " Confirm against primary sources before acting.";

  return `${corroborationNote}${focus}${paywallNote}`.slice(0, 420);
}

function buildSignalNextWatch(story: Story): string {
  return buildMetadataWhatToWatch(story);
}

export function buildMetadataSignalIntelligence(
  story: Story,
  corroborating: Story[],
  profile: OnboardingProfile | null,
  profileFingerprint: string,
  options?: { paywall?: boolean }
): StoryIntelligencePackage {
  const signalSummary = buildSignalSummary(story, corroborating);
  const paywall = options?.paywall ?? Boolean(story.paywallDetected);

  const pkg: StoryIntelligencePackage = {
    theBriefing: signalSummary,
    whyItMatters: buildSignalWhyItMatters(story, corroborating, paywall),
    whyItMattersToYou:
      profile && canGeneratePersonalizedSection(profile)
        ? buildMetadataPersonalizedWhy(story, profile)
        : undefined,
    nextWatch: buildSignalNextWatch(story),
    generatedAt: new Date().toISOString(),
    profileFingerprint,
    generatedBy: "metadata",
    paywallSignal: paywall,
    signalSummaryDisclaimer: paywall
      ? PAYWALL_SIGNAL_DISCLAIMER
      : METADATA_SIGNAL_DISCLAIMER,
    materialSlugs: [story.slug, ...corroborating.map((s) => s.slug)],
  };

  return repairStoryIntelligencePackage(story, pkg, profile);
}

/** @deprecated Use buildMetadataSignalIntelligence */
export function buildPaywallSignalIntelligence(
  story: Story,
  corroborating: Story[],
  profile: OnboardingProfile | null,
  profileFingerprint: string
): StoryIntelligencePackage {
  return buildMetadataSignalIntelligence(
    story,
    corroborating,
    profile,
    profileFingerprint,
    { paywall: true }
  );
}

export function resolveMetadataSignalIntelligence(
  story: Story,
  pool: Story[],
  profile: OnboardingProfile | null,
  profileFingerprint: string,
  options?: { paywall?: boolean }
): StoryIntelligencePackage {
  const corroborating = findCorroboratingStoriesForIntelligence(story, pool, 6);
  return buildMetadataSignalIntelligence(
    story,
    corroborating,
    profile,
    profileFingerprint,
    options
  );
}

/** @deprecated Use resolveMetadataSignalIntelligence */
export function resolvePaywallSignalIntelligence(
  story: Story,
  corpus: Story[],
  profile: OnboardingProfile | null,
  profileFingerprint: string
): StoryIntelligencePackage {
  return resolveMetadataSignalIntelligence(
    story,
    corpus,
    profile,
    profileFingerprint,
    { paywall: true }
  );
}
