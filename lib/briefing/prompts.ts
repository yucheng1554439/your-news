import "server-only";

import { truncateForModel } from "@/lib/extraction/clean";
import type { WeeklyBriefingSelection } from "@/lib/briefing/weekly-selection";
import type { BriefingCadence, BriefingMode } from "@/lib/briefing/types";
import {
  WEEKLY_FOR_YOU,
  WEEKLY_GLOBAL,
  WEEKLY_ADVISOR_RULES,
  WRITING_RULES,
  WEEKLY_SYNTHESIS_RULES,
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

function buildGlobalLandscapeDigest(
  selection: WeeklyBriefingSelection,
  cadenceLabel: string
): string {
  const allStories = selection.threads.flatMap((t) => t.stories);
  const uniqueSlugs = new Set(allStories.map((s) => s.slug));

  const threadDigests = selection.threads
    .map((thread, idx) => {
      return `NARRATIVE CLUSTER ${idx + 1} — ${thread.label}
${buildClusterDigest(thread)}`;
    })
    .join("\n\n");

  return `${cadenceLabel.toUpperCase()} GLOBAL — FULL DESK LANDSCAPE

You receive the COMPLETE ${cadenceLabel} corpus (${uniqueSlugs.size} unique articles, ${selection.threads.length} narrative clusters).
Synthesize across ALL clusters — never write from a single headline in isolation.

${threadDigests}`;
}

function buildForYouLandscapeDigest(
  selection: WeeklyBriefingSelection,
  cadenceLabel: string
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

  return `FOR YOU ${cadenceLabel.toUpperCase()} — FULL LANDSCAPE FIRST, THEN PRIORITIZE

You have the COMPLETE ${cadenceLabel} information landscape (${uniqueSlugs.size} unique articles in synthesis, ${totalClusterArticles} total cluster articles, ${selection.threads.length} narrative clusters).
Global and For You see the same source material. Your job is INTERPRETATION:
answer "Of everything that happened, what matters most to THIS reader?"

READER PRIORITY GUIDE (conclusions only — do NOT omit competing narratives from your reasoning):
${priorityGuide}

SYNTHESIS RULES:
- WHAT_CHANGED: cover 2–4 parallel developments across the FULL landscape (not one headline).
- WHY_YOU: explain which threads matter most for this reader and why others are secondary.
- Do NOT write as if only the top-scored cluster existed — show you saw the full desk.
- Filter conclusions, not facts. Competing explanations must be acknowledged.

${threadDigests}`;
}

function buildBriefingLandscapeDigest(
  selection: WeeklyBriefingSelection
): string {
  const cadenceLabel = selection.cadence === "daily" ? "daily" : "weekly";

  if (selection.mode === "for-you") {
    return buildForYouLandscapeDigest(selection, cadenceLabel);
  }

  return buildGlobalLandscapeDigest(selection, cadenceLabel);
}

const SYSTEM: Record<`${BriefingCadence}-${BriefingMode}`, string> = {
  "daily-global":
    "You write a DAILY Global brief from the FULL last-24h desk landscape — all clusters and articles provided. Synthesize the day's developments; never reduce to one headline.",
  "daily-for-you":
    "You write a DAILY For You brief from the SAME full daily corpus Global sees. Prioritize for this reader; do not remove source material from your reasoning.",
  "weekly-global":
    "You write a WEEKLY Global pattern brief from the FULL weekly corpus — all clusters provided. Higher abstraction than any single headline.",
  "weekly-for-you":
    "You write a WEEKLY For You pattern brief from the FULL weekly corpus clustered into narrative threads — the same landscape Global sees. Prioritize and interpret; do not pretend only top interests happened.",
};

export function buildWeeklyBriefingPrompt(
  selection: WeeklyBriefingSelection,
  profile: OnboardingProfile | null,
  behavioralNote?: string
): { system: string; user: string } {
  const { mode, cadence } = selection;
  const key = `${cadence}-${mode}` as const;
  const allStories = selection.threads.flatMap((t) => t.stories);

  const section = mode === "global" ? WEEKLY_GLOBAL : WEEKLY_FOR_YOU;
  const modeFrame = buildWeeklyModeFrame(mode, profile, cadence);
  const styleBlock = buildProfileStyleBlock(profile, cadence);
  const advisorBlock =
    mode === "for-you"
      ? `${PERSONAL_ADVISOR_MANDATE}\n${buildCareerAdvisorLens(profile)}`
      : "";

  const material = buildBriefingLandscapeDigest(selection);

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
- Answer: "What changed in the last 24 hours?" using the FULL daily landscape below.
- WHAT_CHANGED = 2–4 parallel developments across clusters (not one headline).
- Do NOT describe a multi-day strategy or weekly arc.
- Ground every claim in the provided articles — you received ${allStories.length} stories across ${selection.threads.length} narratives.
${DAILY_THESIS_EXTRA}`
      : `WEEKLY RULES:
- Answer: "What pattern emerged this week?"
- WHAT_CHANGED = cross-cluster strategic pattern (2–4 parallel threads) — NOT one IPO or company headline.
- WHY_YOU must name engineering/hiring/infrastructure/vendor/capital implications for THIS reader.
- Name relationships between clusters — capital, policy, technology, supply chain links.
- Higher abstraction than daily; still grounded in provided articles.
${mode === "for-you" ? "- For You: prioritize which patterns matter to THIS reader; NEVER say 'no direct impact' when 5+ relevant stories exist." : ""}
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

${WEEKLY_SYNTHESIS_RULES}

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
