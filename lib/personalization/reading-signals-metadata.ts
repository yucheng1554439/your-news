/** Clerk publicMetadata key for reading behavior. */
export const READING_SIGNALS_METADATA_KEY = "readingSignals";

const MAX_OPENS = 100;
const MAX_SESSIONS = 20;

export type ReadingSignalEntry = {
  slug: string;
  category: string;
  tags: string[];
  openedAt: number;
  dwellMs?: number;
};

export type SessionEntry = {
  id: string;
  startedAt: number;
  lastActiveAt: number;
  storyOpens: number;
  categoriesViewed: string[];
};

export type ReadingSignalsMetadata = {
  version: 2;
  opens: ReadingSignalEntry[];
  /** Legacy + click counts per story category */
  categoryCounts: Record<string, number>;
  categoryClicks: Record<string, number>;
  /** Filter selected but no meaningful engagement */
  categoryIgnores: Record<string, number>;
  tagScores: Record<string, number>;
  savedTagScores: Record<string, number>;
  /** Slugs where AI intelligence declared the story off-profile */
  aiIrrelevantSlugs?: Record<string, number>;
  refreshCount: number;
  lastRefreshAt: number;
  sessions: SessionEntry[];
  updatedAt: number;
};

export function emptyReadingSignals(): ReadingSignalsMetadata {
  return {
    version: 2,
    opens: [],
    categoryCounts: {},
    categoryClicks: {},
    categoryIgnores: {},
    tagScores: {},
    savedTagScores: {},
    refreshCount: 0,
    lastRefreshAt: 0,
    sessions: [],
    updatedAt: 0,
  };
}

export function parseReadingSignalsFromMetadata(
  metadata: Record<string, unknown> | undefined
): ReadingSignalsMetadata {
  const raw = metadata?.[READING_SIGNALS_METADATA_KEY];
  if (!raw || typeof raw !== "object") return emptyReadingSignals();
  const r = raw as Partial<ReadingSignalsMetadata> & { version?: number };

  const categoryCounts =
    r.categoryCounts && typeof r.categoryCounts === "object"
      ? { ...r.categoryCounts }
      : {};

  const base: ReadingSignalsMetadata = {
    version: 2,
    opens: Array.isArray(r.opens) ? r.opens.slice(0, MAX_OPENS) : [],
    categoryCounts,
    categoryClicks:
      r.categoryClicks && typeof r.categoryClicks === "object"
        ? { ...r.categoryClicks }
        : { ...categoryCounts },
    categoryIgnores:
      r.categoryIgnores && typeof r.categoryIgnores === "object"
        ? { ...r.categoryIgnores }
        : {},
    tagScores:
      r.tagScores && typeof r.tagScores === "object" ? { ...r.tagScores } : {},
    savedTagScores:
      r.savedTagScores && typeof r.savedTagScores === "object"
        ? { ...r.savedTagScores }
        : {},
    aiIrrelevantSlugs:
      r.aiIrrelevantSlugs && typeof r.aiIrrelevantSlugs === "object"
        ? { ...r.aiIrrelevantSlugs }
        : {},
    refreshCount: typeof r.refreshCount === "number" ? r.refreshCount : 0,
    lastRefreshAt: typeof r.lastRefreshAt === "number" ? r.lastRefreshAt : 0,
    sessions: Array.isArray(r.sessions) ? r.sessions.slice(0, MAX_SESSIONS) : [],
    updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : 0,
  };

  const legacyV1 = (r as { version?: number }).version === 1;
  if (legacyV1 || !r.categoryClicks) {
    for (const [k, v] of Object.entries(categoryCounts)) {
      if (!base.categoryClicks[k]) base.categoryClicks[k] = v;
    }
  }

  return base;
}

function touchSession(
  existing: ReadingSignalsMetadata,
  category?: string
): SessionEntry[] {
  const now = Date.now();
  const sessions = [...existing.sessions];
  let current = sessions[0];

  if (!current || now - current.lastActiveAt > 30 * 60 * 1000) {
    current = {
      id: `s-${now}`,
      startedAt: now,
      lastActiveAt: now,
      storyOpens: 0,
      categoriesViewed: [],
    };
    sessions.unshift(current);
  }

  current.lastActiveAt = now;
  if (category && !current.categoriesViewed.includes(category)) {
    current.categoriesViewed.push(category);
  }

  return sessions.slice(0, MAX_SESSIONS);
}

export function recordStoryOpen(
  existing: ReadingSignalsMetadata,
  entry: Omit<ReadingSignalEntry, "openedAt"> & { openedAt?: number }
): ReadingSignalsMetadata {
  const openedAt = entry.openedAt ?? Date.now();
  const opens = [
    { ...entry, openedAt },
    ...existing.opens.filter((o) => o.slug !== entry.slug),
  ].slice(0, MAX_OPENS);

  const categoryCounts = { ...existing.categoryCounts };
  categoryCounts[entry.category] = (categoryCounts[entry.category] ?? 0) + 1;

  const categoryClicks = { ...existing.categoryClicks };
  categoryClicks[entry.category] = (categoryClicks[entry.category] ?? 0) + 1;

  const tagScores = { ...existing.tagScores };
  for (const tag of entry.tags) {
    tagScores[tag] = (tagScores[tag] ?? 0) + 1;
  }

  const sessions = touchSession(existing, entry.category);
  if (sessions[0]) sessions[0].storyOpens += 1;

  return {
    ...existing,
    opens,
    categoryCounts,
    categoryClicks,
    tagScores,
    sessions,
    updatedAt: openedAt,
  };
}

export function recordStoryDwell(
  existing: ReadingSignalsMetadata,
  slug: string,
  dwellMs: number
): ReadingSignalsMetadata {
  if (dwellMs < 3000) return existing;

  const opens = existing.opens.map((o) =>
    o.slug === slug ? { ...o, dwellMs: (o.dwellMs ?? 0) + dwellMs } : o
  );

  return {
    ...existing,
    opens,
    updatedAt: Date.now(),
  };
}

export function recordCategoryClick(
  existing: ReadingSignalsMetadata,
  category: string
): ReadingSignalsMetadata {
  if (category === "all") {
    return { ...existing, sessions: touchSession(existing), updatedAt: Date.now() };
  }

  const categoryClicks = { ...existing.categoryClicks };
  categoryClicks[category] = (categoryClicks[category] ?? 0) + 1;

  const categoryCounts = { ...existing.categoryCounts };
  categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;

  return {
    ...existing,
    categoryClicks,
    categoryCounts,
    sessions: touchSession(existing, category),
    updatedAt: Date.now(),
  };
}

export function recordCategoryIgnore(
  existing: ReadingSignalsMetadata,
  category: string
): ReadingSignalsMetadata {
  if (category === "all") return existing;

  const categoryIgnores = { ...existing.categoryIgnores };
  categoryIgnores[category] = (categoryIgnores[category] ?? 0) + 1;

  return {
    ...existing,
    categoryIgnores,
    updatedAt: Date.now(),
  };
}

export function recordStorySaved(
  existing: ReadingSignalsMetadata,
  tags: string[],
  category: string
): ReadingSignalsMetadata {
  const savedTagScores = { ...existing.savedTagScores };
  for (const tag of tags) {
    savedTagScores[tag] = (savedTagScores[tag] ?? 0) + 8;
  }
  const tagScores = { ...existing.tagScores };
  for (const tag of tags) {
    tagScores[tag] = (tagScores[tag] ?? 0) + 3;
  }

  const categoryClicks = { ...existing.categoryClicks };
  categoryClicks[category] = (categoryClicks[category] ?? 0) + 4;

  return {
    ...existing,
    savedTagScores,
    tagScores,
    categoryClicks,
    updatedAt: Date.now(),
  };
}

export function recordIntelligenceRefresh(
  existing: ReadingSignalsMetadata
): ReadingSignalsMetadata {
  const now = Date.now();
  return {
    ...existing,
    refreshCount: existing.refreshCount + 1,
    lastRefreshAt: now,
    sessions: touchSession(existing),
    updatedAt: now,
  };
}

export function totalDwellMs(signals: ReadingSignalsMetadata): number {
  return signals.opens.reduce((sum, o) => sum + (o.dwellMs ?? 0), 0);
}

export function recordAiIrrelevantStory(
  existing: ReadingSignalsMetadata,
  slug: string
): ReadingSignalsMetadata {
  const aiIrrelevantSlugs = { ...(existing.aiIrrelevantSlugs ?? {}) };
  aiIrrelevantSlugs[slug] = (aiIrrelevantSlugs[slug] ?? 0) + 1;

  return {
    ...existing,
    aiIrrelevantSlugs,
    updatedAt: Date.now(),
  };
}
