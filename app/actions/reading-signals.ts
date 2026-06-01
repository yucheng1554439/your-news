"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { mergePublicMetadata } from "@/lib/clerk/merge-public-metadata";
import {
  emptyReadingSignals,
  parseReadingSignalsFromMetadata,
  recordAiIrrelevantStory,
  recordCategoryClick,
  recordCategoryIgnore,
  recordIntelligenceRefresh,
  recordStoryDwell,
  recordStoryOpen,
  type ReadingSignalsMetadata,
} from "@/lib/personalization/reading-signals-metadata";
import type { Story } from "@/lib/types";

async function readReadingMetadata(userId: string): Promise<{
  publicMetadata: Record<string, unknown>;
  reading: ReadingSignalsMetadata;
}> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const publicMetadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
  return {
    publicMetadata,
    reading: parseReadingSignalsFromMetadata(publicMetadata),
  };
}

async function persistReading(
  userId: string,
  publicMetadata: Record<string, unknown>,
  reading: ReadingSignalsMetadata
): Promise<void> {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: mergePublicMetadata(publicMetadata, { readingSignals: reading }),
  });
}

export async function getReadingSignalsFromClerk(): Promise<ReadingSignalsMetadata> {
  const { userId } = await auth();
  if (!userId) return emptyReadingSignals();

  const { reading } = await readReadingMetadata(userId);
  return reading;
}

export async function recordStoryOpenForUser(
  story: Pick<Story, "slug" | "category" | "tags">
): Promise<{ ok: boolean }> {
  const { userId } = await auth();
  if (!userId) return { ok: false };

  try {
    const { publicMetadata, reading } = await readReadingMetadata(userId);
    const next = recordStoryOpen(reading, {
      slug: story.slug,
      category: story.category,
      tags: story.tags,
    });
    await persistReading(userId, publicMetadata, next);
    return { ok: true };
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
    const { publicMetadata, reading } = await readReadingMetadata(userId);
    const next = recordStoryDwell(reading, slug, dwellMs);
    await persistReading(userId, publicMetadata, next);
    return { ok: true };
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
    const { publicMetadata, reading } = await readReadingMetadata(userId);
    const next = recordCategoryClick(reading, category);
    await persistReading(userId, publicMetadata, next);
    return { ok: true };
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
    const { publicMetadata, reading } = await readReadingMetadata(userId);
    const next = recordCategoryIgnore(reading, category);
    await persistReading(userId, publicMetadata, next);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function recordIntelligenceRefreshForUser(): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  try {
    const { publicMetadata, reading } = await readReadingMetadata(userId);
    const next = recordIntelligenceRefresh(reading);
    await persistReading(userId, publicMetadata, next);
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
    const { publicMetadata, reading } = await readReadingMetadata(userId);
    const next = recordAiIrrelevantStory(reading, slug);
    await persistReading(userId, publicMetadata, next);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
