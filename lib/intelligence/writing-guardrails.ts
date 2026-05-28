/**
 * Shared tone contract + light post-parse cleanup for intelligence output.
 */

/** Patterns that indicate Bloomberg cosplay / unsupported macro drama. */
const BANNED_PHRASE =
  /\b(repricing(?:\s+(?:risk\s+)?assets)?|macro\s+repricing|demand-side\s+dimension|compression\s+of\s+long-duration\s+growth|long-duration\s+growth|dominant\s+(?:shift|theme)|incentives\s+shifted|faster\s+than\s+consensus|through-line|signal\s+vs\.?\s+noise|game-changer|private\s+desk|landscape\s+shifted|worth\s+tracking|risk\s+assets?\s+repric|repriced\s+in\s+parallel|defining\s+repricing|pseudo-|hedge\s+fund\s+memo)\b/gi;

const ABSTRACT_CHAIN =
  /\b(cascade|contagion|regime\s+shift|structural\s+inflection|paradigm)\b/gi;

export const GROUNDED_REASONING = `Grounded reasoning:
- Order: what happened (from the source) → one plausible implication → what to watch or verify.
- Connect dots only when the article supports the link. Use "likely", "if confirmed", or "unclear yet" when evidence is thin.
- Prefer plain verbs (raised, cut, delayed, reported, sued) over finance jargon (repriced, compressed, dimension, lane).
- One clear idea per sentence. Shorter beats clever.`;

export const OPERATOR_TONE = `Operator briefing tone:
- Sound like a trusted colleague — clear, calm, sharp, practical.
- Useful beats impressive. No Bloomberg cosplay, no hedge-fund memo voice, no stacked abstractions.
- Do not pretend certainty. Do not invent macro chains the sources do not support.`;

/** True when text is mostly filler or banned dramatic framing. */
export function violatesGroundedTone(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  BANNED_PHRASE.lastIndex = 0;
  if (BANNED_PHRASE.test(t)) return true;
  const abstractHits = (t.match(ABSTRACT_CHAIN) ?? []).length;
  if (abstractHits >= 2) return true;
  return false;
}

/** Strip banned phrases and collapse whitespace (safety net after model output). */
export function sanitizeGroundedProse(text: string): string {
  BANNED_PHRASE.lastIndex = 0;
  let out = text
    .replace(BANNED_PHRASE, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;])/g, "$1")
    .trim();
  if (out.length < 12) return text.trim();
  return out;
}
