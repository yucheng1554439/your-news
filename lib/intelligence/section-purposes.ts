/**
 * Section purposes — shared contract for prompts and fallbacks.
 */

import {
  CONFIDENCE_CALIBRATION,
  GROUNDED_REASONING,
  OPERATOR_TONE,
} from "@/lib/intelligence/writing-guardrails";

export const WEEKLY_ADVISOR_RULES = `${OPERATOR_TONE}
- Weekly: one narrative lane only. Homepage copy — short and scannable, not a report.`;

export const WRITING_RULES = `Writing standard:
${GROUNDED_REASONING}
${CONFIDENCE_CALIBRATION}
${OPERATOR_TONE}
- Use specifics from the source (names, numbers, actions, dates).
- Do not label categories ("technology dominated") — describe what changed.
- Banned jargon/theatrics: repricing, risk assets, demand-side dimension, dominant shift, through-line, game-changer, private desk, "will inevitably", "certain to".
- Use only facts from provided material.`;

export const STORY_SECTIONS = {
  theBriefing: {
    purpose: "What happened?",
    task: "2 sentences max. Who did what, when. Facts only — no implications.",
  },
  whyItMatters: {
    purpose: "Why might this matter?",
    task: "2 sentences max. One plausible consequence tied to the article. Label inference if needed (may/could).",
  },
  whyItMattersToYou: {
    purpose: "Personal advisor (THIS reader only)",
    task: "2–3 sentences. Answer: (1) Why does this matter to them? (2) What decision could it influence? (3) What to monitor next? Use may/could. Do not repeat whyItMatters.",
  },
} as const;

export const WEEKLY_GLOBAL = {
  purpose: "What mattered in the world this week (this narrative)?",
  task: "World judgment only: what happened, who was affected, what may follow if it continues, what to verify. Not personal career advice.",
} as const;

export const WEEKLY_FOR_YOU = {
  purpose: "What developments matter most to THIS reader this week?",
  task: "Multi-narrative personal briefing: synthesize ALL provided threads through career, interests, focus, and tone. State what affects their decisions, plausible implications (may/could), and watch items. Must differ fundamentally from Global.",
} as const;
