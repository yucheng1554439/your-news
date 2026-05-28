import { normalizeHeadlineKey } from "@/lib/importance-scoring";
import {
  legacySuffixFromUrl,
  slugSuffix,
  slugify,
  stableIdFromUrl,
} from "@/lib/slug";
import type { Story } from "@/lib/types";

function suffixMatchesStory(suffix: string, story: Story): boolean {
  if (story.slug === suffix || story.slug.endsWith(`-${suffix}`)) return true;
  if (!story.sourceUrl) return false;
  return (
    stableIdFromUrl(story.sourceUrl) === suffix ||
    legacySuffixFromUrl(story.sourceUrl) === suffix
  );
}

/** Resolve a story from the live pool — exact slug, URL id, legacy suffix, or headline. */
export function resolveStoryFromPool(
  slugParam: string,
  stories: Story[]
): Story | undefined {
  const decoded = decodeURIComponent(slugParam).trim();
  if (!decoded) return undefined;

  const exact = stories.find((s) => s.slug === decoded);
  if (exact) return exact;

  const suffix = slugSuffix(decoded);
  if (suffix) {
    const bySuffix = stories.filter((s) => suffixMatchesStory(suffix, s));
    if (bySuffix.length === 1) return bySuffix[0];
    if (bySuffix.length > 1) {
      const base = decoded.slice(0, decoded.length - suffix.length - 1);
      const narrowed = bySuffix.find((s) => s.slug.startsWith(base));
      if (narrowed) return narrowed;
      return bySuffix[0];
    }
  }

  const headlineKey = normalizeHeadlineKey(
    decoded.replace(/-/g, " ").replace(/\s+idx\d+$/, "")
  );
  const byHeadline = stories.filter(
    (s) => normalizeHeadlineKey(s.headline) === headlineKey
  );
  if (byHeadline.length === 1) return byHeadline[0];

  const baseOnly = slugify(decoded.replace(/-idx\d+$/, ""));
  const byBase = stories.filter((s) => slugify(s.headline) === baseOnly);
  if (byBase.length === 1) return byBase[0];

  return undefined;
}
