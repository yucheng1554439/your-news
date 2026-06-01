/**
 * Tolerant extraction of tagged model output.
 * Paired tags, unclosed tags, markdown headings, label lines, prose fallback.
 */

export type TaggedSections = Map<string, string>;

const KNOWN_SECTION_TAGS = [
  "HEADLINE",
  "TITLE",
  "THESIS",
  "SUMMARY",
  "BRIEFING",
  "WEEKLY_BRIEFING",
  "SYNTHESIS",
  "WHAT_CHANGED",
  "WHAT_CHANGED_TODAY",
  "CHANGED",
  "WHY_YOU",
  "WHY_IT_MATTERS_TO_YOU",
  "WHY_THIS_MATTERS_TO_YOU",
  "WHY_IT_MATTERS",
  "WHY_THIS_MATTERS",
  "IMPLICATIONS",
  "WATCH",
  "WHAT_TO_WATCH",
  "MONITOR",
  "KEY_SIGNAL",
  "POSITIONING",
  "ACTION",
  "DECISIONS",
  "DECISION",
  "ACTIONS",
  "INVALIDATE",
  "INVALIDATE_THESIS",
  "IF_WRONG",
  "WOULD_CHANGE_IF",
] as const;

export function normalizeTag(tag: string): string {
  return tag
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function cleanSectionBody(body: string): string {
  return body
    .replace(/^\s*```[\w]*\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

/** Strip outer markdown fence if the whole response is wrapped. */
export function stripResponseWrapper(text: string): string {
  let t = text.trim();
  const fence = /^```(?:markdown|md|text)?\s*\n([\s\S]*?)\n```\s*$/i.exec(t);
  if (fence) return fence[1]!.trim();
  return t;
}

function setSection(
  sections: TaggedSections,
  rawTag: string,
  body: string
): void {
  const key = normalizeTag(rawTag);
  const cleaned = cleanSectionBody(body);
  if (!cleaned) return;
  const existing = sections.get(key);
  if (!existing || cleaned.length > existing.length) {
    sections.set(key, cleaned);
  }
}

/** Extract all `<TAG>...</TAG>` blocks (case-insensitive; tag names may vary on close). */
function extractPairedTags(text: string, sections: TaggedSections): void {
  const paired =
    /<\s*([A-Za-z][A-Za-z0-9_]*)\s*>\s*([\s\S]*?)\s*<\s*\/\s*([A-Za-z][A-Za-z0-9_]*)\s*>/gi;
  let match: RegExpExecArray | null;
  while ((match = paired.exec(text)) !== null) {
    setSection(sections, match[1], match[2]);
  }
}

/** Opening tag without close — content until next tag or end. */
function extractUnclosedTags(text: string, sections: TaggedSections): void {
  const open =
    /<\s*([A-Za-z][A-Za-z0-9_]*)\s*>\s*([\s\S]*?)(?=<\s*(?:\/\s*)?[A-Za-z][A-Za-z0-9_]*\s*>|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = open.exec(text)) !== null) {
    const body = match[2];
    if (!body || /^\s*<\s*\//.test(body)) continue;
    setSection(sections, match[1], body);
  }
}

/** Markdown ### HEADLINE or # <HEADLINE> blocks */
function extractMarkdownHeaders(text: string, sections: TaggedSections): void {
  const blocks = text.split(
    /(?=^#{1,4}\s*[<\[]?[A-Za-z][A-Za-z0-9_\s]*[>\]]?\s*$)/gim
  );
  for (const block of blocks) {
    const headerMatch = block.match(
      /^#{1,4}\s*[<\[]?\s*([A-Za-z][A-Za-z0-9_]*)\s*[>\]]?\s*\n+([\s\S]*)$/i
    );
    if (!headerMatch) continue;
    setSection(sections, headerMatch[1], headerMatch[2]);
  }
}

/** **HEADLINE** or __HEADLINE__ on its own line, body follows */
function extractBoldHeaders(text: string, sections: TaggedSections): void {
  const re =
    /^\s*(?:\*\*|__)\s*([A-Za-z][A-Za-z0-9_ ]+)\s*(?:\*\*|__)\s*:?\s*\n+([\s\S]*?)(?=^\s*(?:\*\*|__)\s*[A-Za-z]|^#{1,4}\s|^<\s*[A-Za-z]|\Z)/gim;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    setSection(sections, match[1], match[2]);
  }
}

/** TITLE: on same line or TITLE:\\nbody */
function extractLabelLines(text: string, sections: TaggedSections): void {
  for (const tag of KNOWN_SECTION_TAGS) {
    const sameLine = new RegExp(
      `^\\s*(?:#{1,4}\\s*)?(?:\\*\\*)?\\s*${tag}\\s*(?:\\*\\*)?\\s*:\\s*(.+)$`,
      "gim"
    );
    let m: RegExpExecArray | null;
    while ((m = sameLine.exec(text)) !== null) {
      setSection(sections, tag, m[1]);
    }

    const block = new RegExp(
      `^\\s*(?:#{1,4}\\s*)?(?:\\*\\*)?\\s*${tag}\\s*(?:\\*\\*)?\\s*:?\\s*\\n+([\\s\\S]*?)(?=^\\s*(?:#{1,4}\\s*)?(?:\\*\\*)?\\s*(?:${KNOWN_SECTION_TAGS.join("|")})\\s*(?:\\*\\*)?\\s*:?\\s*\\n|^<\\s*[A-Za-z]|\\Z)`,
      "gim"
    );
    while ((m = block.exec(text)) !== null) {
      setSection(sections, tag, m[1]);
    }
  }
}

/** Bracket tags [HEADLINE] ... [/HEADLINE] */
function extractBracketTags(text: string, sections: TaggedSections): void {
  const paired =
    /\[\s*([A-Za-z][A-Za-z0-9_]*)\s*\]\s*([\s\S]*?)\s*\[\s*\/\s*\1\s*\]/gi;
  let match: RegExpExecArray | null;
  while ((match = paired.exec(text)) !== null) {
    setSection(sections, match[1], match[2]);
  }
}

export function listFoundTags(sections: TaggedSections): string[] {
  return [...sections.keys()].sort();
}

export function extractTaggedSections(text: string): TaggedSections {
  const sections: TaggedSections = new Map();
  const trimmed = stripResponseWrapper(text.trim());
  if (!trimmed) return sections;

  extractPairedTags(trimmed, sections);
  extractBracketTags(trimmed, sections);
  extractUnclosedTags(trimmed, sections);
  extractMarkdownHeaders(trimmed, sections);
  extractBoldHeaders(trimmed, sections);
  extractLabelLines(trimmed, sections);

  return sections;
}

export function pickTaggedSection(
  sections: TaggedSections,
  aliases: string[]
): string | undefined {
  for (const alias of aliases) {
    const value = sections.get(normalizeTag(alias));
    if (value?.trim()) return value.trim();
  }
  return undefined;
}

/** Split prose into paragraphs when tags are missing. */
export function splitProseBlocks(text: string, minLength = 40): string[] {
  const stripped = text
    .replace(/<\s*\/?[A-Za-z][A-Za-z0-9_]*\s*>/gi, "\n")
    .replace(/^\s*#{1,6}\s+/gm, "")
    .trim();

  return stripped
    .split(/\n{2,}/)
    .map((p) => cleanSectionBody(p))
    .filter((p) => p.length >= minLength);
}

/** First substantial paragraph (single-block recovery). */
export function firstProseParagraph(text: string, minLength = 32): string {
  const blocks = splitProseBlocks(text, minLength);
  if (blocks[0]) return blocks[0];
  const line = cleanSectionBody(
    text.replace(/<\s*\/?[A-Za-z][A-Za-z0-9_]*\s*>/gi, " ").replace(/\s+/g, " ")
  );
  return line.length >= minLength ? line : "";
}
