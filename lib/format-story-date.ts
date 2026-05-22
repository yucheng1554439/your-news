const MS_MIN = 60 * 1000;
const MS_HOUR = 60 * MS_MIN;
const MS_DAY = 24 * MS_HOUR;

function parsePublishedMs(publishedAt: string): number | null {
  const ms = new Date(publishedAt).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Live-relative editorial timestamp from real publish time.
 */
export function formatRelativeStoryDate(
  publishedAt: string,
  now = Date.now()
): string {
  const published = parsePublishedMs(publishedAt);
  if (published === null) return "";

  const diffMs = Math.max(0, now - published);

  if (diffMs < MS_MIN) return "Now";
  if (diffMs < MS_HOUR) {
    const m = Math.max(1, Math.floor(diffMs / MS_MIN));
    return `${m}m ago`;
  }

  const todayStart = startOfLocalDay(now);
  const storyDayStart = startOfLocalDay(published);

  if (storyDayStart === todayStart) {
    const h = Math.max(1, Math.floor(diffMs / MS_HOUR));
    return `${h}h ago`;
  }

  const yesterdayStart = todayStart - MS_DAY;
  if (storyDayStart === yesterdayStart) return "Yesterday";

  const d = new Date(published);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** @deprecated Use formatRelativeStoryDate */
export function formatStoryDate(publishedAt: string): string {
  return formatRelativeStoryDate(publishedAt);
}
