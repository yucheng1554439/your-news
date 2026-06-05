const PROTECTED_PATTERNS: RegExp[] = [
  /\d+\.\d+%?/g,
  /\b\d+\.\d+\s+million\b/gi,
  /\bU\.S\./g,
  /\bU\.K\./g,
  /\bS&P\s*\d+\b/gi,
  /\bH100\/H200\b/gi,
  /\b[A-Z]{2,5}\/[A-Z0-9]{2,5}\b/g,
];

function protectTokens(text: string): { masked: string; tokens: string[] } {
  const tokens: string[] = [];
  let masked = text;
  for (const pattern of PROTECTED_PATTERNS) {
    masked = masked.replace(pattern, (match) => {
      const idx = tokens.push(match) - 1;
      return `\uE000${idx}\uE001`;
    });
  }
  return { masked, tokens };
}

function restoreTokens(text: string, tokens: string[]): string {
  return text.replace(/\uE000(\d+)\uE001/g, (_, i) => tokens[Number(i)] ?? "");
}

/** Split on sentence boundaries without breaking decimals, tickers, or abbreviations. */
export function splitSentences(text: string): string[] {
  const { masked, tokens } = protectTokens(text.replace(/\s+/g, " ").trim());
  if (!masked) return [];

  const parts =
    masked.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()) ?? [masked];

  return parts
    .map((s) => restoreTokens(s, tokens).trim())
    .filter(Boolean);
}

/** Split prose into scannable chunks — preserves Theme blocks and protected tokens. */
export function splitTextIntoChunks(
  text: string,
  maxSentences = 3
): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  if (/\bTheme \d+:/i.test(normalized)) {
    const blocks = normalized.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
    if (blocks.length > 1) return blocks;
  }

  const sentences = splitSentences(normalized.replace(/\n+/g, " "));
  const chunks: string[] = [];
  for (let i = 0; i < sentences.length; i += maxSentences) {
    chunks.push(sentences.slice(i, i + maxSentences).join(" "));
  }
  return chunks.length > 0 ? chunks : [normalized];
}

/** Format watch items or bullet lines into readable paragraphs. */
export function formatWatchItems(items: string[]): string[] {
  return items
    .map((item) => item.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .map((item) => (item.endsWith(".") ? item : `${item}.`));
}
