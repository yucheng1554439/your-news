import "server-only";

import { truncateForModel } from "@/lib/extraction/clean";
import { getFeedDomain } from "@/lib/feed/domain-buckets";
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
  const index = stories
    .map(
      (s, i) =>
        `${i + 1}. [${getFeedDomain(s)}] ${s.headline} (${s.source})`
    )
    .join("\n");

  const bodies = stories
    .map((s, i) => {
      const material = s.articleBody?.trim() || s.rawExcerpt?.trim() || s.summary;
      const source = s.articleBodySource ?? "excerpt";
      const text = truncateForModel(material, 2200);
      return `--- Story ${i + 1} · ${getFeedDomain(s)} · ${source} ---
Headline: ${s.headline}
${text}`;
    })
    .join("\n\n");

  return `INDEX (read every story body below before writing):\n${index}\n\n${bodies}`;
}

const FOR_YOU_HEADLINE_RULES = `HEADLINE rules (For You):
- ONE sharp insight for THIS reader — not a list of stories.
- 6–12 words, max 88 characters. Title case. No semicolons. No comma chains.
- Sounds like: "Oil Shock Risk Is Rising Faster Than Markets Expect" or "Enterprise AI Spending Is Starting To Tighten".
- NOT: headline lists, "X; Y; Z", or "This week in markets and tech".`;

const GLOBAL_HEADLINE_RULES = `HEADLINE rules (Global):
- ONE definitive weekly thesis — the dominant macro repricing event.
- 6–12 words, max 92 characters. Title case. No semicolons.
- Sounds like: "Middle East Escalation Repriced Global Risk" or "AI Infrastructure Spending Entered A New Phase".
- NOT: compressed article titles or multi-story rollups.`;

const SUMMARY_RULES = `SUMMARY rules (both modes):
- 4–5 sentences. Calm strategic advisor tone — implications, what to monitor, consequences.
- Cover: what changed, why it matters, what could change next, what a decision-maker should watch.
- No magazine voice, no "this week linked", no listing headlines.`;

export function buildWeeklyBriefingPrompt(
  stories: Story[],
  mode: WeeklyBriefingMode,
  profile: OnboardingProfile | null
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
      "You are a strategic intelligence advisor. Synthesize cross-domain developments into one clear weekly judgment. Never summarize stories one-by-one.",
    user: `${WEEKLY_ADVISOR_RULES}

${WRITING_RULES}

You have ${stories.length} stories (${fullTextCount} with full article text).
- Synthesize mechanisms across domains (markets, policy, geopolitics, energy, technology).
- Name specific drivers (policy action, price move, regulation, supply) — not category labels.

SECTION: ${section.purpose}
Task: ${section.task}
${readerBlock}
${headlineRules}
${SUMMARY_RULES}

STORY MATERIAL:
${digest}

Respond using these exact tags (plain text inside each tag, no JSON):

<HEADLINE>
</HEADLINE>

<SUMMARY>
</SUMMARY>

<KEY_SIGNAL>
One sentence: highest-stakes consequence if this week's developments persist
</KEY_SIGNAL>`,
  };
}
