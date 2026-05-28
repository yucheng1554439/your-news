/** Normalize extracted article text for LLM consumption. */
export function cleanArticleText(raw: string): string {
  let text = raw
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\t/g, " ");

  const lines = text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .filter((line) => !isBoilerplateLine(line));

  text = lines.join("\n\n");

  return text.replace(/\n{3,}/g, "\n\n").trim();
}

function isBoilerplateLine(line: string): boolean {
  const lower = line.toLowerCase();
  if (line.length < 25) return false;
  return (
    /^subscribe\b/.test(lower) ||
    /^sign up\b/.test(lower) ||
    /^read more\b/.test(lower) ||
    /^related\b/.test(lower) ||
    /^advertisement\b/.test(lower) ||
    /^all rights reserved/.test(lower) ||
    /^cookie/.test(lower) ||
    /^share this/.test(lower)
  );
}

export function truncateForModel(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastBreak = cut.lastIndexOf("\n\n");
  if (lastBreak > maxChars * 0.7) {
    return `${cut.slice(0, lastBreak).trim()}…`;
  }
  return `${cut.trim()}…`;
}
