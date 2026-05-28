import { createHash } from "crypto";

/** Stable 12-char id from canonical article URL (survives headline edits). */
export function stableIdFromUrl(url: string): string {
  const normalized = url.trim().toLowerCase();
  return createHash("sha256").update(normalized).digest("hex").slice(0, 12);
}

/** @deprecated Suffix used before hash-based slugs — kept for bookmark compatibility. */
export function legacySuffixFromUrl(url: string): string {
  return slugify(url).slice(-12);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function buildStorySlug(
  headline: string,
  articleUrl?: string | null,
  fallbackIndex = 0
): string {
  const slugBase = slugify(headline);
  if (articleUrl?.trim()) {
    return `${slugBase}-${stableIdFromUrl(articleUrl)}`;
  }
  return `${slugBase}-idx${fallbackIndex}`;
}

export function slugSuffix(slug: string): string | null {
  const idx = slug.lastIndexOf("-");
  if (idx <= 0 || idx >= slug.length - 1) return null;
  return slug.slice(idx + 1);
}
