import "server-only";

import { truncateForModel } from "@/lib/extraction/clean";
import type { WeeklyNarrativeSelection } from "@/lib/briefing/narrative-synthesis";
import {
  WEEKLY_FOR_YOU,
  WEEKLY_GLOBAL,
  WEEKLY_ADVISOR_RULES,
  WRITING_RULES,
} from "@/lib/intelligence/section-purposes";
import { buildReaderNote, canPersonalize } from "@/lib/personalization/context";
import type { OnboardingProfile, Story } from "@/lib/types";
import type { WeeklyBriefingMode } from "@/lib/briefing/weekly-engine";

function buildStoryDigest(stories: Story[]): string {
  const bodies = stories
    .map((s, i) => {
      const material = s.articleBody?.trim() || s.rawExcerpt?.trim() || s.summary;
      const source = s.articleBodySource ?? "excerpt";
      const text = truncateForModel(material, 2200);
      return `--- ${i + 1}. ${s.headline} (${s.source}) · ${source} ---
${text}`;
    })
    .join("\n\n");

  return bodies;
}

const FOR_YOU_HEADLINE_RULES = `HEADLINE rules (For You):
- ONE plain insight for THIS reader about THIS narrative only.
- 6–12 words, max 88 characters. Title case. No semicolons.
- State the development or decision point — not abstract macro labels.`;

const GLOBAL_HEADLINE_RULES = `HEADLINE rules (Global):
- ONE plain thesis for THIS narrative only — what actually moved this week.
- 6–12 words, max 92 characters. Title case. No semicolons.
- No jargon (repricing, compression, dimension, regime).`;

const SUMMARY_RULES = `SUMMARY rules:
- 4–5 sentences. Structure: what happened → plausible implication (if sources support it) → what to watch.
- Stay inside the narrative focus. Calm operator voice — not a hedge-fund memo.`;

export function buildWeeklyBriefingPrompt(
  stories: Story[],
  mode: WeeklyBriefingMode,
  profile: OnboardingProfile | null,
  narrative: WeeklyNarrativeSelection
): { system: string; user: string } {
  const digest = buildStoryDigest(stories);
  const fullTextCount = stories.filter((s) => s.articleBodySource === "url").length;

  const section = mode === "global" ? WEEKLY_GLOBAL : WEEKLY_FOR_YOU;

  const readerBlock =
    mode === "for-you" && profile && canPersonalize({ profile })
      ? `${buildReaderNote(profile)}\n`
      : "";

  const headlineRules =
    mode === "for-you" ? FOR_YOU_HEADLINE_RULES : GLOBAL_HEADLINE_RULES;

  return {
    system:
      "You brief a decision-maker in plain English. One narrative thread only. Evidence first, cautious inference second, watch items third. Never blend unrelated storylines or invent macro drama.",
    user: `${WEEKLY_ADVISOR_RULES}

${WRITING_RULES}

NARRATIVE FOCUS (mandatory — do not leave this lane):
${narrative.narrativeLabel}
All ${stories.length} stories below belong to this single thread (${fullTextCount} with full article text).
Only use claims supported by the material below.

SECTION: ${section.purpose}
Task: ${section.task}
${readerBlock}
${headlineRules}
${SUMMARY_RULES}

STORY MATERIAL (one narrative cluster only):
${digest}

Respond using these exact tags (plain text inside each tag, no JSON):

<HEADLINE>
</HEADLINE>

<SUMMARY>
</SUMMARY>

<KEY_SIGNAL>
One sentence: the most concrete fact or near-term watch item from the material — not a dramatic prediction
</KEY_SIGNAL>`,
  };
}
