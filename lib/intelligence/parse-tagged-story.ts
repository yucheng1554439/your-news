import "server-only";

import { intelligenceGeneratedByProvider } from "@/lib/intelligence/provider";
import { extractJsonPayload } from "@/lib/intelligence/provider/extract-json";
import {
  extractTaggedSections,
  pickTaggedSection,
  splitProseBlocks,
} from "@/lib/intelligence/provider/extract-tags";
import type { StoryIntelligencePackage } from "@/lib/intelligence/types";

const BRIEFING_ALIASES = ["THE_BRIEFING", "BRIEFING", "TITLE", "SUMMARY"];
const WHY_ALIASES = ["WHY_IT_MATTERS", "WHY_THIS_MATTERS", "STRATEGIC_IMPORTANCE"];
const PERSONAL_ALIASES = [
  "WHY_THIS_MATTERS_TO_YOU",
  "WHY_IT_MATTERS_TO_YOU",
  "FOR_YOU",
  "READER_IMPACT",
];

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function parseFromJson(
  content: string,
  profileFingerprint: string
): StoryIntelligencePackage | null {
  try {
    const jsonText = extractJsonPayload(content);
    const p = JSON.parse(jsonText) as Record<string, unknown>;
    const req = (k: string) =>
      typeof p[k] === "string" ? (p[k] as string).trim() : "";

    const theBriefing = req("theBriefing");
    const whyItMatters = req("whyItMatters");
    if (!theBriefing && !whyItMatters) return null;

    return buildPackage({
      theBriefing,
      whyItMatters,
      whyItMattersToYou: req("whyItMattersToYou"),
      profileFingerprint,
    });
  } catch {
    return null;
  }
}

function buildPackage(input: {
  theBriefing: string;
  whyItMatters: string;
  whyItMattersToYou?: string;
  profileFingerprint: string;
}): StoryIntelligencePackage | null {
  let theBriefing = input.theBriefing.trim();
  let whyItMatters = input.whyItMatters.trim();
  const whyItMattersToYou = input.whyItMattersToYou?.trim();

  if (!theBriefing && whyItMatters) {
    const sentences = whyItMatters.match(/[^.!?]+[.!?]+/g) ?? [whyItMatters];
    if (sentences.length > 1) {
      const mid = Math.ceil(sentences.length / 2);
      theBriefing = sentences.slice(0, mid).join("").trim();
      whyItMatters = sentences.slice(mid).join("").trim();
    } else {
      theBriefing = whyItMatters;
    }
  }

  if (theBriefing && !whyItMatters) {
    const sentences = theBriefing.match(/[^.!?]+[.!?]+/g) ?? [theBriefing];
    if (sentences.length > 1) {
      const mid = Math.ceil(sentences.length / 2);
      theBriefing = sentences.slice(0, mid).join("").trim();
      whyItMatters = sentences.slice(mid).join("").trim();
    }
  }

  if (!theBriefing || theBriefing.length < 16) return null;
  if (!whyItMatters || whyItMatters.length < 20) {
    if (theBriefing.length >= 48) {
      whyItMatters = theBriefing;
    } else {
      return null;
    }
  }

  return {
    theBriefing: clip(theBriefing, 400),
    whyItMatters: clip(whyItMatters, 480),
    whyItMattersToYou:
      whyItMattersToYou && whyItMattersToYou.length >= 16
        ? clip(whyItMattersToYou, 520)
        : undefined,
    generatedAt: new Date().toISOString(),
    profileFingerprint: input.profileFingerprint,
    generatedBy: intelligenceGeneratedByProvider(),
  };
}

function parseFromTags(
  content: string,
  profileFingerprint: string
): StoryIntelligencePackage | null {
  const sections = extractTaggedSections(content);

  let theBriefing = pickTaggedSection(sections, BRIEFING_ALIASES) ?? "";
  let whyItMatters = pickTaggedSection(sections, WHY_ALIASES) ?? "";
  const whyItMattersToYou = pickTaggedSection(sections, PERSONAL_ALIASES);

  if (!theBriefing && !whyItMatters) {
    const blocks = splitProseBlocks(content, 32);
    if (blocks.length >= 2) {
      theBriefing = blocks[0];
      whyItMatters = blocks[1];
    } else if (blocks.length === 1) {
      theBriefing = blocks[0];
    }
  }

  return buildPackage({
    theBriefing,
    whyItMatters,
    whyItMattersToYou,
    profileFingerprint,
  });
}

/** Parse Claude/OpenAI story intelligence — tags first, JSON as secondary. */
export function parseStoryIntelligenceResponse(
  content: string,
  profileFingerprint: string
): StoryIntelligencePackage | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const fromTags = parseFromTags(trimmed, profileFingerprint);
  if (fromTags) return fromTags;

  return parseFromJson(trimmed, profileFingerprint);
}
