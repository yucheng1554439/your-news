import "server-only";

/** Model decline / meta-responses — never show as briefing content. */
const REFUSAL_PATTERNS: RegExp[] = [
  /i can'?t fabricate/i,
  /i cannot fabricate/i,
  /without real source material/i,
  /please provide source material/i,
  /do not have enough information/i,
  /don't have enough information/i,
  /insufficient source(?:\s+material)?/i,
  /unable to (?:write|create|generate) (?:a )?briefing/i,
  /cannot (?:write|create|generate) (?:a )?briefing/i,
  /no source material (?:was )?provided/i,
  /i'?m unable to (?:summarize|synthesize)/i,
  /as an ai language model/i,
  /i don'?t have access to (?:real[- ]time|current) news/i,
];

export function isModelRefusal(text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 20) return false;
  return REFUSAL_PATTERNS.some((p) => {
    p.lastIndex = 0;
    return p.test(t);
  });
}

export function responseLooksLikeRefusal(content: string): boolean {
  if (!content.trim()) return false;
  if (isModelRefusal(content)) return true;
  const firstBlock = content.split(/\n{2,}/)[0]?.trim() ?? "";
  return isModelRefusal(firstBlock);
}

export function briefingContainsRefusal(parts: {
  headline?: string;
  summary?: string;
  whatChanged?: string;
  whyYou?: string;
  whyItMatters?: string;
  keySignal?: string;
}): boolean {
  const blob = [
    parts.headline,
    parts.summary,
    parts.whatChanged,
    parts.whyYou,
    parts.whyItMatters,
    parts.keySignal,
  ]
    .filter(Boolean)
    .join("\n");
  return isModelRefusal(blob);
}
