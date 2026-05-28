/**
 * Section purposes — shared contract for prompts and fallbacks.
 */

export const WEEKLY_ADVISOR_RULES = `Advisor tone:
- Sharp, calm, strategic. You counsel a decision-maker — not a magazine reader.
- State implications, what to monitor, and what could change if the trend holds.
- No theatrics, no vague editorial filler, no headline lists.`;

export const WRITING_RULES = `Rules:
- Plain, factual English. Write like a sharp analyst, not a magazine editor.
- Explain cause → effect → who must react. Use specifics from the source (names, numbers, actions).
- Do not label categories ("technology dominated") — describe what changed.
- Banned phrases: dominant theme, incentives shifted, faster than consensus, documentary, landscape, worth tracking, through-line, repricing, signal vs noise, game-changer, private desk.
- No hedging: "may", "could", "watch whether".
- Use only facts from provided material.`;

export const STORY_SECTIONS = {
  theBriefing: {
    purpose: "What happened?",
    task: "2–3 sentences. Who did what, when. Facts only.",
  },
  whyItMatters: {
    purpose: "Why is this strategically important?",
    task: "2–3 sentences. Concrete consequences: markets, policy, supply chains, adoption, regulation, competition — cite the mechanism.",
  },
  whyItMattersToYou: {
    purpose: "How does this affect THIS reader?",
    task: "2–3 sentences. What changes for their job or decisions. One specific follow-up check.",
  },
} as const;

export const WEEKLY_GLOBAL = {
  purpose: "What is the defining macro repricing event this week?",
  task: "One judgment across the material: the dominant shift, who is repricing, and why it persists. Advisor tone — not a survey of headlines.",
} as const;

export const WEEKLY_FOR_YOU = {
  purpose: "What is the one thing THIS reader must pay attention to?",
  task: "One personalized judgment: highest-stakes implication for this reader's decisions — risks, timing, exposure. Not a list of stories.",
} as const;
