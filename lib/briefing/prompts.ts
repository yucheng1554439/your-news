import "server-only";

import { truncateForModel } from "@/lib/extraction/clean";
import type { WeeklyBriefingSelection } from "@/lib/briefing/weekly-selection";
import {
  WEEKLY_FOR_YOU,
  WEEKLY_GLOBAL,
  WEEKLY_ADVISOR_RULES,
  WRITING_RULES,
} from "@/lib/intelligence/section-purposes";
import { buildWeeklyModeFrame } from "@/lib/personalization/weekly-frame";
import type { OnboardingProfile, Story } from "@/lib/types";
import type { WeeklyBriefingMode } from "@/lib/briefing/weekly-engine";

function buildStoryDigest(stories: Story[]): string {
  return stories
    .map((s, i) => {
      const material = s.articleBody?.trim() || s.rawExcerpt?.trim() || s.summary;
      const source = s.articleBodySource ?? "excerpt";
      const text = truncateForModel(material, 1400);
      return `  ${i + 1}. ${s.headline} (${s.source})
${text}`;
    })
    .join("\n\n");
}

function buildGlobalDigest(selection: WeeklyBriefingSelection): string {
  const thread = selection.threads[0]!;
  return `WORLD NARRATIVE: ${thread.label}
${buildStoryDigest(thread.stories)}`;
}

function buildForYouDigest(selection: WeeklyBriefingSelection): string {
  return selection.threads
    .map((thread, idx) => {
      return `THREAD ${idx + 1} — ${thread.label} (reader relevance ${thread.personalScore}/10)
${buildStoryDigest(thread.stories)}`;
    })
    .join("\n\n");
}

const GLOBAL_HEADLINE_RULES = `HEADLINE (Global):
- What mattered in the world — 6–10 words, max 88 characters, title case.
- Single world frame — not personal advice.`;

const FOR_YOU_HEADLINE_RULES = `HEADLINE (For You):
- This reader's week in priority terms — 6–12 words, max 92 characters, title case.
- May reflect multiple personal stakes (e.g. rates + AI spend + hiring) — not one cluster only.`;

const GLOBAL_SUMMARY_RULES = `SUMMARY (Global):
- Exactly 3 short sentences (~60–75 words). One world narrative only.
- (1) What happened. (2) World implication if it holds (may/could). (3) What to watch.`;

const FOR_YOU_SUMMARY_RULES = `SUMMARY (For You):
- 4–5 short sentences (~85–100 words), scannable (facts then implications).
- Cover 2–4 threads from below — one sentence each on what matters FOR THIS READER.
- Label uncertainty where needed. End with their top watch item across threads.`;

const SYSTEM_BY_MODE: Record<WeeklyBriefingMode, string> = {
  global:
    "You write the Global weekly briefing: the single dominant world narrative this week. Short homepage copy.",
  "for-you":
    "You write a personal strategic briefing: synthesize MULTIPLE developments that matter to this specific reader. Never reduce to one cluster or reword Global.",
};

export function buildWeeklyBriefingPrompt(
  selection: WeeklyBriefingSelection,
  profile: OnboardingProfile | null
): { system: string; user: string } {
  const mode = selection.mode;
  const allStories = selection.threads.flatMap((t) => t.stories);
  const fullTextCount = allStories.filter(
    (s) => s.articleBodySource === "url"
  ).length;

  const section = mode === "global" ? WEEKLY_GLOBAL : WEEKLY_FOR_YOU;
  const modeFrame = buildWeeklyModeFrame(mode, profile);
  const material =
    mode === "global"
      ? buildGlobalDigest(selection)
      : buildForYouDigest(selection);

  const headlineRules =
    mode === "for-you" ? FOR_YOU_HEADLINE_RULES : GLOBAL_HEADLINE_RULES;
  const summaryRules =
    mode === "for-you" ? FOR_YOU_SUMMARY_RULES : GLOBAL_SUMMARY_RULES;

  const threadNote =
    mode === "for-you"
      ? `${selection.threads.length} personal priority threads — synthesize ALL that matter; do not merge unrelated lanes.`
      : `1 world narrative thread.`;

  return {
    system: SYSTEM_BY_MODE[mode],
    user: `${WEEKLY_ADVISOR_RULES}

${WRITING_RULES}

${modeFrame}

${threadNote}
${fullTextCount} stories with full article text where noted.

SECTION: ${section.purpose}
Task: ${section.task}

${headlineRules}
${summaryRules}

MATERIAL:
${material}

Respond using these exact tags (plain text inside each tag, no JSON):

<HEADLINE>
</HEADLINE>

<SUMMARY>
</SUMMARY>

<KEY_SIGNAL>
One short line: this reader's top watch item (For You) or world's top fact to watch (Global)
</KEY_SIGNAL>`,
  };
}
