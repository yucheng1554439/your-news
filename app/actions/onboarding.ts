"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { classifyPersistenceError } from "@/lib/clerk/classify-persistence-error";
import {
  CLERK_PUBLIC_METADATA_MAX_BYTES,
  jsonByteSize,
  metadataSizeReport,
} from "@/lib/clerk/metadata-size";
import { mergePublicMetadata } from "@/lib/clerk/merge-public-metadata";
import { getOnboardingForUser } from "@/lib/services/onboarding";
import type { OnboardingProfile } from "@/lib/types";

export type SaveOnboardingErrorCategory =
  | "validation"
  | "network"
  | "metadata_size"
  | "clerk_metadata"
  | "auth"
  | "unknown";

export type SaveOnboardingResult =
  | { ok: true }
  | { ok: false; error: string; category: SaveOnboardingErrorCategory };

/** Clerk stores only identity onboarding — not topic prefs or behavioral data. */
export type ClerkOnboardingSlice = Omit<OnboardingProfile, "topicPreferences">;

function toClerkOnboardingSlice(
  profile: OnboardingProfile
): ClerkOnboardingSlice {
  const { topicPreferences: _topics, ...slice } = profile;
  return slice;
}

function logSaveEvent(
  event: string,
  payload: Record<string, unknown>
): void {
  console.log(`[ONBOARDING_SAVE] ${event}`, JSON.stringify(payload));
}

function logSaveError(
  event: string,
  payload: Record<string, unknown>
): void {
  console.error(`[ONBOARDING_SAVE] ${event}`, JSON.stringify(payload));
}

async function persistClerkOnboarding(
  userId: string,
  profile: OnboardingProfile
): Promise<SaveOnboardingResult> {
  const clerkSlice = toClerkOnboardingSlice(profile);
  const stamped: ClerkOnboardingSlice = {
    ...clerkSlice,
    updatedAt: profile.updatedAt ?? Date.now(),
  };

  const onboardingBytes = jsonByteSize(stamped);

  logSaveEvent("persist_start", {
    userId,
    onboardingPayloadSize: onboardingBytes,
    storage: "clerk_identity_only",
  });

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const existing = (user.publicMetadata ?? {}) as Record<string, unknown>;
    const merged = mergePublicMetadata(existing, { onboarding: stamped });
    const sizeReport = metadataSizeReport(merged);

    logSaveEvent("metadata_size_check", {
      userId,
      onboardingPayloadSize: onboardingBytes,
      totalMetadataBytes: sizeReport.payloadSize,
      metadataLimitBytes: CLERK_PUBLIC_METADATA_MAX_BYTES,
      keySizes: sizeReport.keySizes,
    });

    if (!sizeReport.withinLimit) {
      const message = `Account preferences exceed Clerk storage (${sizeReport.payloadSize} / ${CLERK_PUBLIC_METADATA_MAX_BYTES} bytes). Contact support.`;
      logSaveError("metadata_size_rejected", {
        userId,
        totalMetadataBytes: sizeReport.payloadSize,
        keySizes: sizeReport.keySizes,
      });
      return { ok: false, error: message, category: "metadata_size" };
    }

    await client.users.updateUserMetadata(userId, {
      publicMetadata: merged,
    });

    logSaveEvent("persist_ok", {
      userId,
      totalMetadataBytes: sizeReport.payloadSize,
    });
    return { ok: true };
  } catch (err) {
    const classified = classifyPersistenceError(err, "clerk_onboarding");
    logSaveError("persist_failed", {
      userId,
      errorCategory: classified.category,
      errorDetail: classified.detail,
      statusCode: classified.statusCode,
    });
    return {
      ok: false,
      error: classified.message,
      category: classified.category,
    };
  }
}

/** Identity onboarding from Clerk + topic preferences from KV profile store. */
export async function getOnboardingFromClerk(): Promise<OnboardingProfile | null> {
  const { userId } = await auth();
  if (!userId) return null;
  return getOnboardingForUser(userId);
}

export async function saveOnboardingToClerk(
  profile: OnboardingProfile
): Promise<SaveOnboardingResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Not authenticated", category: "auth" };
  }

  return persistClerkOnboarding(userId, profile);
}

export async function readOnboardingMetadataSize(): Promise<{
  totalMetadataBytes: number;
  keySizes: Record<string, number>;
  withinLimit: boolean;
} | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const existing = (user.publicMetadata ?? {}) as Record<string, unknown>;
  const report = metadataSizeReport(existing);
  return {
    totalMetadataBytes: report.payloadSize,
    keySizes: report.keySizes,
    withinLimit: report.withinLimit,
  };
}
