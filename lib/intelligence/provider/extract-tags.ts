/**
 * Tolerant extraction of tagged model output.
 * Supports paired tags, common aliases, markdown headings, and prose fallback.
 */

export type TaggedSections = Map<string, string>;

function normalizeTag(tag: string): string {
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
    .trim();
}

/** Extract all `<TAG>...</TAG>` blocks (case-insensitive tag names). */
export function extractTaggedSections(text: string): TaggedSections {
  const sections: TaggedSections = new Map();
  const trimmed = text.trim();
  if (!trimmed) return sections;

  const paired =
    /<\s*([A-Za-z][A-Za-z0-9_]*)\s*>\s*([\s\S]*?)\s*<\s*\/\s*\1\s*>/gi;
  let match: RegExpExecArray | null;
  while ((match = paired.exec(trimmed)) !== null) {
    const key = normalizeTag(match[1]);
    const body = cleanSectionBody(match[2]);
    if (!body) continue;
    const existing = sections.get(key);
    if (!existing || body.length > existing.length) {
      sections.set(key, body);
    }
  }

  const headerBlocks = trimmed.split(
    /(?=^#{1,3}\s*[<\[]?[A-Za-z][A-Za-z0-9_\s]*[>\]]?\s*$)/gim
  );
  for (const block of headerBlocks) {
    const headerMatch = block.match(
      /^#{1,3}\s*[<\[]?\s*([A-Za-z][A-Za-z0-9_]*)\s*[>\]]?\s*\n+([\s\S]*)$/i
    );
    if (!headerMatch) continue;
    const key = normalizeTag(headerMatch[1]);
    const body = cleanSectionBody(headerMatch[2]);
    if (!body) continue;
    if (!sections.has(key) || body.length > (sections.get(key)?.length ?? 0)) {
      sections.set(key, body);
    }
  }

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
export function splitProseBlocks(
  text: string,
  minLength = 40
): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => cleanSectionBody(p))
    .filter((p) => p.length >= minLength);
}
