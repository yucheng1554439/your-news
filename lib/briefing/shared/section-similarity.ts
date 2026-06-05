/** Normalize text for overlap comparison. */
export function normalizeForSimilarity(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(text: string): Set<string> {
  const stop = new Set([
    "the",
    "a",
    "an",
    "for",
    "you",
    "your",
    "this",
    "that",
    "and",
    "or",
    "to",
    "of",
    "in",
    "on",
    "is",
    "are",
    "with",
    "from",
    "as",
    "at",
    "by",
    "it",
    "be",
    "may",
    "would",
    "could",
    "should",
  ]);
  return new Set(
    normalizeForSimilarity(text)
      .split(" ")
      .filter((w) => w.length > 2 && !stop.has(w))
  );
}

/** Jaccard similarity on word tokens — 0–1. */
export function semanticSimilarity(a: string, b: string): number {
  const ta = tokenSet(a);
  const tb = tokenSet(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) {
    if (tb.has(t)) inter += 1;
  }
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function sectionsTooSimilar(
  a: string,
  b: string,
  threshold = 0.7
): boolean {
  const na = normalizeForSimilarity(a);
  const nb = normalizeForSimilarity(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  return semanticSimilarity(a, b) >= threshold;
}
