"use server";

import { auth } from "@clerk/nextjs/server";
import {
  emptyReadingSignals,
  recordAiIrrelevantStory,
  recordCategoryClick,
  recordCategoryIgnore,
  recordIntelligenceRefresh,
  recordStoryDwell,
  recordStoryOpen,
  type ReadingSignalsMetadata,
} from "@/lib/personalization/reading-signals-metadata";
import {
  getReadingSignalsForUser,
  loadUserProfile,
  patchUserProfile,
} from "@/lib/user-profile/store";
import type { Story } from "@/lib/types";

export async function getReadingSignalsFromClerk(): Promise<ReadingSignalsMetadata> {
  const { userId } = await auth();
  if (!userId) return emptyReadingSignals();
  return getReadingSignalsForUser(userId);
}

async function persistReadingSignals(
  userId: string,
  reading: ReadingSignalsMetadata
): Promise<boolean> {
  const result = await patchUserProfile(userId, { readingSignals: reading });
  return result.ok;
}

export async function recordStoryOpenForUser(
  story: Pick<Story, "slug" | "category" | "tags">
): Promise<{ ok: boolean }> {
  const { userId } = await auth();
  if (!userId) return { ok: false };

  try {
    const record = await loadUserProfile(userId);
    const next = recordStoryOpen(record.readingSignals, {
      slug: story.slug,
      category: story.category,
      tags: story.tags,
    });
    return { ok: await persistReadingSignals(userId, next) };
  } catch {
    return { ok: false };
  }
}

export async function recordStoryDwellForUser(
  slug: string,
  dwellMs: number
): Promise<{ ok: boolean }> {
  const { userId } = await auth();
  if (!userId || dwellMs < 3000) return { ok: false };

  try {
    const record = await loadUserProfile(userId);
    const next = recordStoryDwell(record.readingSignals, slug, dwellMs);
    return { ok: await persistReadingSignals(userId, next) };
  } catch {
    return { ok: false };
  }
}

export async function recordCategoryClickForUser(
  category: string
): Promise<{ ok: boolean }> {
  const { userId } = await auth();
  if (!userId) return { ok: false };

  try {
    const record = await loadUserProfile(userId);
    const next = recordCategoryClick(record.readingSignals, category);
    return { ok: await persistReadingSignals(userId, next) };
  } catch {
    return { ok: false };
  }
}

export async function recordCategoryIgnoreForUser(
  category: string
): Promise<{ ok: boolean }> {
  const { userId } = await auth();
  if (!userId) return { ok: false };

  try {
    const record = await loadUserProfile(userId);
    const next = recordCategoryIgnore(record.readingSignals, category);
    return { ok: await persistReadingSignals(userId, next) };
  } catch {
    return { ok: false };
  }
}

export async function recordIntelligenceRefreshForUser(): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  try {
    const record = await loadUserProfile(userId);
    const next = recordIntelligenceRefresh(record.readingSignals);
    await persistReadingSignals(userId, next);
  } catch {
    /* non-blocking */
  }
}

export async function recordAiIrrelevantForUser(
  slug: string
): Promise<{ ok: boolean }> {
  const { userId } = await auth();
  if (!userId) return { ok: false };

  try {
    const record = await loadUserProfile(userId);
    const next = recordAiIrrelevantStory(record.readingSignals, slug);
    return { ok: await persistReadingSignals(userId, next) };
  } catch {
    return { ok: false };
  }
}
