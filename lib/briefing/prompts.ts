import "server-only";

import { truncateForModel } from "@/lib/extraction/clean";
import type { WeeklyBriefingSelection } from "@/lib/briefing/weekly-selection";
import type { BriefingCadence, BriefingMode } from "@/lib/briefing/types";
import {
  WEEKLY_FOR_YOU,
  WEEKLY_GLOBAL,
  WEEKLY_ADVISOR_RULES,
  WRITING_RULES,
} from "@/lib/intelligence/section-purposes";
import {
  PERSONAL_ADVISOR_MANDATE,
  buildCareerAdvisorLens,
} from "@/lib/personalization/advisor-frame";
import { buildProfileStyleBlock } from "@/lib/personalization/profile-style";
import { buildWeeklyModeFrame } from "@/lib/personalization/weekly-frame";
import {
  DAILY_THESIS_EXTRA,
  THESIS_TITLE_RULES,
  WEEKLY_THESIS_EXTRA,
} from "@/lib/briefing/thesis-title";
import {
  storyHasUsableMaterial,
  storySourceText,
} from "@/lib/briefing/source-material";
import { formatStoryTagsForPrompt } from "@/lib/intelligence/story-tags";
import type { OnboardingProfile, Story } from "@/lib/types";

const MEMO_TAGS = `Use these exact tags:

<HEADLINE>
</HEADLINE>

<WHAT_CHANGED>
</WHAT_CHANGED>

<WHY_YOU>
</WHY_YOU>

<WHY_IT_MATTERS>
</WHY_IT_MATTERS>

<WATCH>
• bullet
</WATCH>

<POSITIONING>
</POSITIONING>

<INVALIDATE>
</INVALIDATE>`;

function buildStoryDigest(stories: Story[]): string {
  if (stories.length === 0) {
    return "  (No stories attached — do not invent facts.)";
  }

  return stories
    .map((s, i) => {
      const material = storySourceText(s);
      const source = s.articleBodySource ?? (s.articleBody ? "body" : "excerpt");
      const text = truncateForModel(material || s.headline, 1400);
      const usable = storyHasUsableMaterial(s);
      return `  ${i + 1}. [${s.slug}] ${s.headline}
     Source: ${s.source} · Published: ${s.publishedAt} · ${formatStoryTagsForPrompt(s)}
     Material: ${source} (${material.length} chars, usable=${usable})
${text}`;
    })
    .join("\n\n");
}

function buildClusterDigest(thread: WeeklyBriefingSelection["threads"][0]): string {
  const cluster = thread.cluster;
  if (!cluster) {
    return buildStoryDigest(thread.stories);
  }

  const timeline = cluster.timeline
    .slice(0, 8)
    .map((t) => `  - ${t.date}: ${t.event}`)
    .join("\n");

  return `NARRATIVE EVENT (synthesize ONE development — not ${cluster.articleCount} separate headlines):
Title: ${cluster.title}
Summary: ${cluster.summary}
Articles: ${cluster.articleCount} · Outlets: ${cluster.sourceCount} · Corroboration: ${(cluster.corroborationScore * 100).toFixed(0)}%
Tags: ${cluster.tags.join(", ")}
Timeline:
${timeline || "  (none)"}

Source articles (ground every claim in this set):
${buildStoryDigest(thread.stories)}`;
}

function buildDailyDigest(selection: WeeklyBriefingSelection): string {
  const thread = selection.threads[0]!;
  return `TODAY'S EVENT (last 24 hours — do NOT write the weekly pattern):
${thread.label}
${buildClusterDigest(thread)}`;
}

function buildForYouWeeklyLandscapeDigest(
  selection: WeeklyBriefingSelection
): string {
  const allStories = selection.threads.flatMap((t) => t.stories);
  const uniqueSlugs = new Set(allStories.map((s) => s.slug));
  const totalClusterArticles = selection.threads.reduce(
    (n, t) => n + (t.cluster?.articleCount ?? t.stories.length),
    0
  );

  const priorityGuide = selection.threads
    .map((thread, idx) => {
      const tier =
        thread.personalScore >= 8
          ? "PRIMARY — lead with this"
          : thread.personalScore >= 5
            ? "SECONDARY — explain relevance"
            : "CONTEXT — acknowledge but deprioritize";
      return `${idx + 1}. [${tier}] score=${thread.personalScore} — ${thread.label}`;
    })
    .join("\n");

  const threadDigests = selection.threads
    .map((thread, idx) => {
      return `NARRATIVE CLUSTER ${idx + 1} — ${thread.label} (reader score ${thread.personalScore})
${buildClusterDigest(thread)}`;
    })
    .join("\n\n");

  return `FOR YOU WEEKLY — FULL LANDSCAPE FIRST, THEN PRIORITIZE

You have the COMPLETE weekly information landscape (${uniqueSlugs.size} unique articles in synthesis, ${totalClusterArticles} total cluster articles, ${selection.threads.length} narrative clusters).
Global and For You see the same source material. Your job is INTERPRETATION:
answer "Of everything that happened this week, what matters most to THIS reader?"

READER PRIORITY GUIDE (conclusions only — do NOT omit competing narratives from your reasoning):
${priorityGuide}

SYNTHESIS RULES:
- WHAT_CHANGED: name 2–4 parallel strategic patterns across the FULL landscape (not one headline).
- WHY_YOU: explain which patterns matter most for this reader and why others are secondary.
- Do NOT write as if only the top-scored cluster existed — show you saw the full week.
- Filter conclusions, not facts. Competing explanations must be acknowledged.

${threadDigests}`;
}

function buildWeeklyPatternDigest(selection: WeeklyBriefingSelection): string {
  if (selection.mode === "for-you" && selection.cadence === "weekly") {
    return buildForYouWeeklyLandscapeDigest(selection);
  }

  if (selection.mode === "global" && selection.threads.length === 1) {
    const thread = selection.threads[0]!;
    return `WEEKLY STRATEGIC PATTERN (synthesize the arc across the week — NOT today's single headline):
${thread.label}
${buildClusterDigest(thread)}

Identify 2–4 strategic objectives moving in parallel this week (numbered in WHAT_CHANGED).`;
  }

  return selection.threads
    .map((thread, idx) => {
      return `PATTERN THREAD ${idx + 1} — ${thread.label}
${buildClusterDigest(thread)}`;
    })
    .join("\n\n");
}

const SYSTEM: Record<`${BriefingCadence}-${BriefingMode}`, string> = {
  "daily-global":
    "You write a DAILY Global event brief: what changed in the world in the last 24 hours. One event. Not the weekly pattern.",
  "daily-for-you":
    "You write a DAILY For You event brief: what changed in the last 24 hours that matters to this specific reader. One event.",
  "weekly-global":
    "You write a WEEKLY Global pattern brief: what strategic pattern emerged this week. Higher abstraction than any single headline.",
  "weekly-for-you":
    "You write a WEEKLY For You pattern brief. You receive the FULL weekly corpus clustered into narrative threads — the same landscape Global sees. Prioritize and interpret for this reader; do not pretend only their top interests happened.",
};

export function buildWeeklyBriefingPrompt(
  selection: WeeklyBriefingSelection,
  profile: OnboardingProfile | null,
  behavioralNote?: string
): { system: string; user: string } {
  const { mode, cadence, lens } = selection;
  const key = `${cadence}-${mode}` as const;
  const allStories = selection.threads.flatMap((t) => t.stories);

  const section = mode === "global" ? WEEKLY_GLOBAL : WEEKLY_FOR_YOU;
  const modeFrame = buildWeeklyModeFrame(mode, profile, cadence);
  const styleBlock = buildProfileStyleBlock(profile, cadence);
  const advisorBlock =
    mode === "for-you"
      ? `${PERSONAL_ADVISOR_MANDATE}\n${buildCareerAdvisorLens(profile)}`
      : "";

  const material =
    lens === "event"
      ? buildDailyDigest(selection)
      : buildWeeklyPatternDigest(selection);

  if (allStories.length === 0) {
    console.warn(
      `[WEEKLY_ENGINE] ${cadence} briefing prompt blocked: no stories selected for ${mode}`
    );
    throw new Error(
      `${cadence} briefing prompt blocked: no stories selected for ${mode}`
    );
  }

  const cadenceRules =
    cadence === "daily"
      ? `DAILY RULES:
- Answer: "What changed in the last 24 hours?"
- WHAT_CHANGED = the specific new announcement, policy, earnings, or geopolitical move (facts only).
- Do NOT describe a multi-day strategy or weekly arc.
- Do NOT repeat language suitable for a weekly pattern brief.
${DAILY_THESIS_EXTRA}`
      : `WEEKLY RULES:
- Answer: "What pattern emerged this week?"
- WHAT_CHANGED = the week's strategic pattern (e.g. three parallel objectives), NOT one IPO or headline.
- Name the pattern (capital strategy, policy shift) — not the triggering event.
- Higher abstraction than the daily brief.
${mode === "for-you" ? "- For You: prioritize which patterns matter to THIS reader after surveying ALL clusters below." : ""}
${WEEKLY_THESIS_EXTRA}`;

  const responseTags =
    mode === "for-you"
      ? `${MEMO_TAGS}

Fill WHY_YOU and INVALIDATE. Leave WHY_IT_MATTERS empty.`
      : `${MEMO_TAGS}

Fill WHY_IT_MATTERS. Leave WHY_YOU and INVALIDATE empty.`;

  return {
    system: SYSTEM[key],
    user: `${WEEKLY_ADVISOR_RULES}

${WRITING_RULES}

${THESIS_TITLE_RULES}

${cadenceRules}
${styleBlock}
${modeFrame}
${behavioralNote ? `${behavioralNote}\n` : ""}
${advisorBlock}

SECTION: ${section.purpose}
Task: ${section.task}

SOURCE ARTICLES (ground every claim in this material only):
${material}

${responseTags}`,
  };
}
