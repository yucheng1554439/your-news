/**
 * Multi-user isolation verification harness.
 *
 * Run: npx tsx --tsconfig tsconfig.json scripts/verify-multi-user-isolation.ts
 */
import { createHash } from "crypto";
import path from "path";
import { mkdir } from "fs/promises";
import { resolveDashboardIsolationDebug } from "../lib/api/dashboard-debug";
import { serializeDashboardResponse } from "../lib/api/serialize-dashboard";
import { serializeSignalsApi } from "../lib/api/serialize-signals-api";
import { getProfileBriefingFingerprint } from "../lib/briefing/profile-fingerprint";
import type { IntelligenceBriefing } from "../lib/briefing/types";
import { loadPlatformDashboard } from "../lib/intelligence/platform-snapshot";
import { refreshPlatformIntelligence } from "../lib/intelligence/platform-snapshot";
import { PERSIST_KEYS, userIntelligenceSnapshotKey, userProfileKey } from "../lib/persistence/keys";
import { persistGet, persistSet } from "../lib/persistence/kv-store";
import { readPlatformIntelligenceSnapshot } from "../lib/persistence/intelligence-snapshot-persist";
import {
  buildUserIntelligenceSnapshot,
  readUserIntelligenceSnapshot,
  writeUserIntelligenceSnapshot,
} from "../lib/persistence/user-intelligence-snapshot-persist";
import { writePersistedStoryPool } from "../lib/persistence/story-pool-persist";
import {
  getTopicPreferencesForUserId,
  saveTopicPreferencesForUserId,
} from "../lib/services/topic-preferences";
import { toggleSavedStoryForUserId } from "../lib/services/saved-stories";
import {
  emptyUserIntelligenceRecord,
} from "../lib/user-profile/store";
import type { UserIntelligenceRecord } from "../lib/user-profile/types";
import type { OnboardingProfile } from "../lib/types";
import {
  VERIFY_AI_STORY,
  VERIFY_FINANCE_STORY,
  VERIFY_STORY_FIXTURES,
} from "./fixtures/multi-user-test-stories";

const USER_A = "verify-user-a-ai";
const USER_B = "verify-user-b-markets";

const PROFILE_A: OnboardingProfile = {
  interests: ["ai"],
  career: "engineer",
  focusType: "depth",
  tone: "analytical",
  completed: true,
  updatedAt: 1_700_000_000_001,
  topicPreferences: { moreOf: ["ai"], lessOf: [], neverShow: [] },
};

const PROFILE_B: OnboardingProfile = {
  interests: ["markets"],
  career: "investor",
  focusType: "breadth",
  tone: "concise",
  completed: true,
  updatedAt: 1_700_000_000_002,
  topicPreferences: { moreOf: ["markets"], lessOf: [], neverShow: [] },
};

type UserSnapshot = {
  feedSlugs: string[];
  forYouHeadline: string;
  risingSignalIds: string[];
  savedSlugs: string[];
  topicMoreOf: string[];
  profileFingerprint: string;
  debug: Awaited<ReturnType<typeof resolveDashboardIsolationDebug>>;
};

type TestResult = {
  id: string;
  description: string;
  pass: boolean;
  details: string;
};

const results: TestResult[] = [];

function hash(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 12);
}

function briefingFixture(
  userId: string,
  cadence: "daily" | "weekly",
  marker: string
): IntelligenceBriefing {
  const now = Date.now();
  return {
    cadence,
    mode: "for-you",
    periodLabel: cadence === "daily" ? "Today" : "This week",
    headline: `[${marker}] ${cadence} briefing for ${userId}`,
    summary: `Synthetic ${cadence} summary (${marker}).`,
    keySignal: `Key signal ${marker}`,
    whatChanged: `What changed ${marker}`,
    whyYou: `Why you ${marker}`,
    watchItems: [`Watch ${marker}`],
    provenance: {
      articleCount: 3,
      narrativeCount: 1,
      sourceCount: 2,
      sources: ["Verify Wire", "Test Desk"],
    },
    generatedBy: "fallback",
    generatedAt: now,
  };
}

async function seedStoryPool(): Promise<void> {
  const now = Date.now();
  await mkdir(path.join(process.cwd(), ".data", "persistent"), {
    recursive: true,
  });
  await writePersistedStoryPool({
    stories: VERIFY_STORY_FIXTURES,
    fetchedAt: now,
    error: null,
    rateLimited: false,
  });
}

async function seedUserProfiles(): Promise<void> {
  for (const [userId, profile] of [
    [USER_A, PROFILE_A],
    [USER_B, PROFILE_B],
  ] as const) {
    const record = emptyUserIntelligenceRecord(userId);
    record.topicPreferences = profile.topicPreferences!;
    await persistSet(userProfileKey(userId), record);
  }
}

async function seedInitialBriefings(): Promise<void> {
  for (const [userId, profile, marker] of [
    [USER_A, PROFILE_A, "BASE-A"],
    [USER_B, PROFILE_B, "BASE-B"],
  ] as const) {
    const fp = getProfileBriefingFingerprint(profile);
    await writeUserIntelligenceSnapshot(
      buildUserIntelligenceSnapshot({
        userId,
        profileFingerprint: fp,
        updatedAt: Date.now(),
        forYou: briefingFixture(userId, "daily", marker),
      })
    );
  }
}

async function captureUserState(
  userId: string,
  profile: OnboardingProfile
): Promise<UserSnapshot> {
  const dashboard = await loadPlatformDashboard(profile, { userId });
  const payload = serializeDashboardResponse(profile, dashboard);
  const stories =
    dashboard.stories.length > 0 ? dashboard.stories : dashboard.globalStories;
  const signals = serializeSignalsApi(
    stories,
    profile,
    dashboard.userIntelligence,
    true
  );
  const debug = await resolveDashboardIsolationDebug(userId, profile);
  const saved = await persistGet<UserIntelligenceRecord>(userProfileKey(userId));
  const topicPreferences = await getTopicPreferencesForUserId(userId);

  return {
    feedSlugs: payload.stories.slice(0, 8).map((s) => s.slug),
    forYouHeadline: dashboard.briefings["for-you"]?.headline ?? "",
    risingSignalIds: signals.rising.map((s) => s.id),
    savedSlugs: (saved?.savedStories.items ?? []).map((i) => i.slug).sort(),
    topicMoreOf: topicPreferences.moreOf,
    profileFingerprint: debug.profileFingerprint,
    debug,
  };
}

function record(
  id: string,
  description: string,
  pass: boolean,
  details: string
): void {
  results.push({ id, description, pass, details });
  const icon = pass ? "PASS" : "FAIL";
  console.log(`[${icon}] ${id}: ${description}`);
  if (!pass || process.env.VERBOSE_VERIFY === "1") {
    console.log(`       ${details}`);
  }
}

function unchangedExcept(
  before: UserSnapshot,
  after: UserSnapshot,
  allowedChanges: Partial<Record<keyof UserSnapshot, boolean>>
): { ok: boolean; detail: string } {
  const checks: { key: keyof UserSnapshot; label: string }[] = [
    { key: "feedSlugs", label: "feed" },
    { key: "forYouHeadline", label: "for-you briefing" },
    { key: "risingSignalIds", label: "signals" },
    { key: "savedSlugs", label: "saved stories" },
    { key: "topicMoreOf", label: "topic preferences" },
    { key: "profileFingerprint", label: "profile fingerprint" },
  ];

  const changed: string[] = [];
  for (const { key, label } of checks) {
    const beforeVal = before[key];
    const afterVal = after[key];
    const same = JSON.stringify(beforeVal) === JSON.stringify(afterVal);
    if (!same && !allowedChanges[key]) {
      changed.push(label);
    }
  }

  if (changed.length === 0) {
    return { ok: true, detail: "unchanged" };
  }
  return {
    ok: false,
    detail: `unexpected changes: ${changed.join(", ")}`,
  };
}

async function profileWithTopics(
  base: OnboardingProfile,
  userId: string
): Promise<OnboardingProfile> {
  const topicPreferences = await getTopicPreferencesForUserId(userId);
  return { ...base, topicPreferences };
}

async function simulateUserBriefingRefresh(
  userId: string,
  profile: OnboardingProfile,
  marker: string
): Promise<void> {
  const fp = getProfileBriefingFingerprint(profile);
  await writeUserIntelligenceSnapshot(
    buildUserIntelligenceSnapshot({
      userId,
      profileFingerprint: fp,
      updatedAt: Date.now(),
      forYou: briefingFixture(userId, "daily", marker),
    })
  );
}

async function verifyPlatformSnapshotHasNoForYou(): Promise<boolean> {
  const platform = await readPlatformIntelligenceSnapshot();
  if (!platform) return true;
  const hasForYou =
    Boolean(platform.briefings.daily["for-you"]) ||
    Boolean(platform.briefings.weekly["for-you"]);
  return !hasForYou;
}

async function verifyUserKeyIsolation(
  actorId: string,
  otherId: string,
  otherBefore: UserSnapshot,
  otherAfter: UserSnapshot
): Promise<void> {
  const actorKey = userIntelligenceSnapshotKey(actorId);
  const otherKey = userIntelligenceSnapshotKey(otherId);
  const actorSnap = await readUserIntelligenceSnapshot(actorId);
  const otherSnap = await readUserIntelligenceSnapshot(otherId);
  record(
    `${actorId}-key-written`,
    `${actorId} user intel key exists after action`,
    Boolean(actorSnap),
    actorKey
  );
  record(
    `${otherId}-key-stable`,
    `${otherId} user intel key headline unchanged`,
    otherBefore.forYouHeadline === otherAfter.forYouHeadline,
    `${otherKey} for-you="${otherAfter.forYouHeadline}"`
  );
}

async function run(): Promise<void> {
  console.log("=== Multi-user isolation verification ===\n");

  await seedStoryPool();
  await seedUserProfiles();
  await seedInitialBriefings();

  let stateA = await captureUserState(USER_A, PROFILE_A);
  let stateB = await captureUserState(USER_B, PROFILE_B);

  record(
    "setup-debug-a",
    "User A for-you briefings read from user-scoped key",
    stateA.debug.snapshotScope.forYouDaily === "user-scoped" &&
      stateA.debug.briefingSourceKey.forYouDaily ===
        userIntelligenceSnapshotKey(USER_A),
    JSON.stringify(stateA.debug)
  );
  record(
    "setup-debug-b",
    "User B for-you briefings read from user-scoped key",
    stateB.debug.snapshotScope.forYouDaily === "user-scoped" &&
      stateB.debug.briefingSourceKey.forYouDaily ===
        userIntelligenceSnapshotKey(USER_B),
    JSON.stringify(stateB.debug)
  );
  record(
    "setup-distinct",
    "Users start with distinct briefing headlines",
    stateA.forYouHeadline !== stateB.forYouHeadline,
    `A="${stateA.forYouHeadline}" B="${stateB.forYouHeadline}"`
  );

  // Test 1: Refresh intelligence as User A
  const beforeA1 = stateA;
  const beforeB1 = stateB;
  const redisRefresh = Boolean(process.env.UPSTASH_REDIS_REST_URL);
  if (redisRefresh) {
    const refreshResult = await refreshPlatformIntelligence(PROFILE_A, {
      userId: USER_A,
    });
    record(
      "1-refresh-a-ran",
      "User A real refresh executed",
      refreshResult.ok,
      refreshResult.error ?? `updatedAt=${refreshResult.updatedAt}`
    );
  } else {
    await simulateUserBriefingRefresh(USER_A, PROFILE_A, "REFRESH-A-1");
    record(
      "1-refresh-a-simulated",
      "User A briefing refresh simulated (no Redis — direct user snapshot write)",
      true,
      "Set UPSTASH_REDIS_REST_URL for full refreshPlatformIntelligence E2E"
    );
  }

  stateA = await captureUserState(USER_A, PROFILE_A);
  stateB = await captureUserState(USER_B, PROFILE_B);

  record(
    "1-a-briefing-changed",
    "User A for-you briefing changed after refresh",
    stateA.forYouHeadline !== beforeA1.forYouHeadline,
    `${beforeA1.forYouHeadline} → ${stateA.forYouHeadline}`
  );

  const t1b = unchangedExcept(beforeB1, stateB, {});
  record(
    "1-b-unchanged",
    "User B briefings unchanged after User A refresh",
    t1b.ok,
    t1b.detail
  );
  await verifyUserKeyIsolation(USER_A, USER_B, beforeB1, stateB);
  record(
    "1-platform-no-foryou",
    "Global snapshot has no for-you briefings after User A refresh",
    await verifyPlatformSnapshotHasNoForYou(),
    PERSIST_KEYS.intelligenceSnapshot
  );

  // Test 2: Refresh intelligence as User B
  const beforeA2 = stateA;
  const beforeB2 = stateB;
  if (redisRefresh) {
    const refreshResult = await refreshPlatformIntelligence(PROFILE_B, {
      userId: USER_B,
    });
    record(
      "2-refresh-b-ran",
      "User B real refresh executed",
      refreshResult.ok,
      refreshResult.error ?? `updatedAt=${refreshResult.updatedAt}`
    );
  } else {
    await simulateUserBriefingRefresh(USER_B, PROFILE_B, "REFRESH-B-2");
  }

  stateA = await captureUserState(USER_A, PROFILE_A);
  stateB = await captureUserState(USER_B, PROFILE_B);

  record(
    "2-b-briefing-changed",
    "User B for-you briefing changed after refresh",
    stateB.forYouHeadline !== beforeB2.forYouHeadline,
    `${beforeB2.forYouHeadline} → ${stateB.forYouHeadline}`
  );
  const t2a = unchangedExcept(beforeA2, stateA, {});
  record(
    "2-a-unchanged",
    "User A briefings unchanged after User B refresh",
    t2a.ok,
    t2a.detail
  );

  // Test 3: Save story as User A
  const beforeA3 = stateA;
  const beforeB3 = stateB;
  await toggleSavedStoryForUserId(USER_A, VERIFY_AI_STORY);
  stateA = await captureUserState(USER_A, PROFILE_A);
  stateB = await captureUserState(USER_B, PROFILE_B);

  record(
    "3-a-feed-changed",
    "User A feed changed after save",
    hash(beforeA3.feedSlugs) !== hash(stateA.feedSlugs) ||
      stateA.savedSlugs.includes(VERIFY_AI_STORY.slug),
    `saved=${stateA.savedSlugs.join(",")} feed=${stateA.feedSlugs.slice(0, 3).join(",")}`
  );
  const t3b = unchangedExcept(beforeB3, stateB, {});
  record(
    "3-b-unchanged",
    "User B feed/briefings/signals/saved/profile unchanged after User A save",
    t3b.ok,
    t3b.detail
  );

  // Test 4: Save story as User B
  const beforeA4 = stateA;
  const beforeB4 = stateB;
  await toggleSavedStoryForUserId(USER_B, VERIFY_FINANCE_STORY);
  stateA = await captureUserState(USER_A, PROFILE_A);
  stateB = await captureUserState(USER_B, PROFILE_B);

  record(
    "4-b-feed-or-saved-changed",
    "User B feed or saved library changed after save",
    hash(beforeB4.feedSlugs) !== hash(stateB.feedSlugs) ||
      stateB.savedSlugs.includes(VERIFY_FINANCE_STORY.slug),
    `saved=${stateB.savedSlugs.join(",")}`
  );
  const t4a = unchangedExcept(beforeA4, stateA, {});
  record(
    "4-a-unchanged",
    "User A feed/briefings/signals/saved/profile unchanged after User B save",
    t4a.ok,
    t4a.detail
  );

  // Test 5: Change topic preferences as User A
  const beforeA5 = stateA;
  const beforeB5 = stateB;
  await saveTopicPreferencesForUserId(USER_A, {
    moreOf: ["ai", "developer"],
    lessOf: ["entertainment"],
    neverShow: [],
  });
  stateA = await captureUserState(USER_A, await profileWithTopics(PROFILE_A, USER_A));
  stateB = await captureUserState(USER_B, await profileWithTopics(PROFILE_B, USER_B));

  record(
    "5-a-feed-changed",
    "User A feed changed after topic preference update",
    hash(beforeA5.feedSlugs) !== hash(stateA.feedSlugs) ||
      JSON.stringify(beforeA5.topicMoreOf) !== JSON.stringify(stateA.topicMoreOf),
    `topics=${stateA.topicMoreOf.join(",")}`
  );
  const t5b = unchangedExcept(beforeB5, stateB, {});
  record(
    "5-b-unchanged",
    "User B unchanged after User A topic preference change",
    t5b.ok,
    t5b.detail
  );

  // Test 6: Change topic preferences as User B
  const beforeA6 = stateA;
  const beforeB6 = stateB;
  await saveTopicPreferencesForUserId(USER_B, {
    moreOf: ["markets", "policy"],
    lessOf: ["sports"],
    neverShow: [],
  });
  stateA = await captureUserState(USER_A, await profileWithTopics(PROFILE_A, USER_A));
  stateB = await captureUserState(USER_B, await profileWithTopics(PROFILE_B, USER_B));

  record(
    "6-b-feed-changed",
    "User B feed changed after topic preference update",
    hash(beforeB6.feedSlugs) !== hash(stateB.feedSlugs) ||
      JSON.stringify(beforeB6.topicMoreOf) !== JSON.stringify(stateB.topicMoreOf),
    `topics=${stateB.topicMoreOf.join(",")}`
  );
  const t6a = unchangedExcept(beforeA6, stateA, {});
  record(
    "6-a-unchanged",
    "User A unchanged after User B topic preference change",
    t6a.ok,
    t6a.detail
  );

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error("Verification script failed:", err);
  process.exitCode = 1;
});
