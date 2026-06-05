/**
 * Section purposes — shared contract for prompts and fallbacks.
 */

import {
  CONFIDENCE_CALIBRATION,
  GROUNDED_REASONING,
  OPERATOR_TONE,
} from "@/lib/intelligence/writing-guardrails";

export const WEEKLY_ADVISOR_RULES = `${OPERATOR_TONE}
- Weekly: synthesize like analyst research — multi-narrative, multi-source, relationship-driven.
- NEVER output placeholder lines ("no direct impact", "monitor whether reporting changes").
- Each section must reference at least 2 narrative clusters or 3+ sources when material allows.`;

export const WEEKLY_SYNTHESIS_RULES = `SYNTHESIS QUALITY (mandatory):
- Write like Morgan Stanley / Goldman strategy research — not news recap, not consulting filler.
- WHAT_CHANGED: cross-cluster pattern — use Theme 1 / Theme 2 structure when 2+ clusters exist. How threads relate, not a list of company headlines.
- WHY_YOU / WHY_IT_MATTERS: decisions, exposure, and implications — cite multiple threads.
- BANNED: "no direct impact detected", single-company summaries, generic "monitor developments".
- Each section ≥ 3 sentences when corpus has 20+ stories.
- Global answers "What happened?" — For You answers "What happened that matters to THIS user?" using the SAME corpus.`;

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
  purpose: "What happened in the world this period?",
  task: "Executive intelligence memo: synthesize ALL provided clusters into 2–5 parallel themes. Format WHAT_CHANGED as Theme 1 / Theme 2 / Theme 3 blocks — each theme references multiple articles and sources. Explain how themes connect. Not a list of company headlines or article excerpts.",
} as const;

export const WEEKLY_FOR_YOU = {
  purpose: "What happened that matters most to THIS reader?",
  task: "Personal investment memo: same corpus as Global, but rank threads by reader career + interests. WHY_YOU must discuss concrete decisions (engineering, hiring, infrastructure, vendors, capital, supply chain) — never 'no direct impact'. Reference 2+ threads with source breadth. WATCH = future confirming events (earnings, policy, procurement). ACTION = what the reader should do (evaluate, review, prepare) — never duplicate WATCH with Monitor/Confirm relevance phrasing.",
} as const;
