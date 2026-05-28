/**
 * Section purposes — shared contract for prompts and fallbacks.
 */

import {
  GROUNDED_REASONING,
  OPERATOR_TONE,
} from "@/lib/intelligence/writing-guardrails";

export const WEEKLY_ADVISOR_RULES = `${OPERATOR_TONE}
- Weekly: one narrative lane only. Explain what moved, what it may mean if it continues, and what evidence to watch next.`;

export const WRITING_RULES = `Writing standard:
${GROUNDED_REASONING}
${OPERATOR_TONE}
- Use specifics from the source (names, numbers, actions, dates).
- Do not label categories ("technology dominated") — describe what changed.
- Banned jargon/theatrics: repricing, risk assets, demand-side dimension, long-duration growth compression, dominant shift, through-line, signal vs noise, game-changer, private desk, landscape, documentary filler, "institutions will rebalance before the narrative settles".
- Light hedging is encouraged when evidence is incomplete ("may", "if reports hold", "watch for").
- Use only facts from provided material.`;

export const STORY_SECTIONS = {
  theBriefing: {
    purpose: "What happened?",
    task: "2–3 sentences. Who did what, when. Facts only — no implications here.",
  },
  whyItMatters: {
    purpose: "Why might this matter?",
    task: "2–3 sentences. One plausible consequence mechanism (markets, policy, supply, competition) tied to facts in the article. No drama, no unsupported macro chains.",
  },
  whyItMattersToYou: {
    purpose: "How might this affect THIS reader?",
    task: "2–3 sentences. Practical relevance for their role. One concrete thing to check. Do not repeat whyItMatters.",
  },
} as const;

export const WEEKLY_GLOBAL = {
  purpose: "What is the main development in this narrative this week?",
  task: "One clear judgment grounded in the stories: what happened, what may change if it continues, and what to verify next. Not macro theater or a headline survey.",
} as const;

export const WEEKLY_FOR_YOU = {
  purpose: "What should THIS reader pay attention to in this narrative?",
  task: "One personalized judgment: the highest-signal fact and a practical implication for their decisions. Name a watch item — not a list of stories.",
} as const;
