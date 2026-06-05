# Intelligence Isolation Audit

**Date:** 2026-06-03  
**Scope:** Refresh Intelligence pipeline, persistence keys, dashboard/signals/briefing readers

## Executive Summary

**Bug confirmed:** For You daily/weekly briefings were written to the global platform snapshot (`yn:v2:intelligence-snapshot`) and read back for every user. User A's refresh could overwrite briefings that User B then loaded.

**Additional issues fixed:**
- Global refresh lock was a process singleton — concurrent refreshes from different users shared one in-flight promise.
- Web homepage did not pass `userId` into `loadPlatformDashboard`, so per-user briefing snapshots were never read on web.
- `resolveBriefing()` cache path read for-you briefings from the platform snapshot.
- User refresh regenerated and overwrote global briefings (now preserved on authenticated refresh).

**Not leaked (already safe):** For You feed ranking, signals ranking, user profile, saved stories, topic preferences, reading behavior — all computed or stored per-user at request time.

---

## GLOBAL DATA

| Key | Contents | Writer | Readers |
|-----|----------|--------|---------|
| `yn:v1:story-pool` | Raw editorial story corpus, fetch metadata | NewsAPI ingest (`getStoryPool`, refresh pipeline) | Dashboard, ranking, briefings, signals |
| `yn:v1:article-bodies` | Article body text index by slug | Article fetch/backfill | Story detail, enrichment |
| `yn:v2:intelligence-snapshot` | `enrichedBySlug` (shared story intelligence), **global only** daily/weekly briefings, `cadenceUpdatedAt` | `writePlatformIntelligenceSnapshot` on refresh; `upsertStoryInPlatformSnapshot` on backfill | `loadPlatformDashboard`, `resolveBriefing` (global mode), story detail enrichment |
| `yn:v2:intelligence-meta` | Last refresh timestamps, model, story counts | `writePlatformIntelligenceSnapshot`, `recordRefreshAttempt` | Ops/debug, freshness UI |
| `yn:v1:weekly:{cacheKey}` | Cached AI briefing by profile fingerprint + cluster hash (not userId) | `writeBriefingCache` during briefing generation | `resolveBriefing` on cache miss fallback |
| `yn:v2:story-intel:{slug}:{profileHash}` | Per-slug intelligence generation cache | Story intelligence batch | Enrichment pipeline |

**Note:** Weekly briefing cache keys include `profileFingerprint`, not `userId`. Two users with identical onboarding profiles may share cached briefing text. Different profiles (e.g. AI vs Markets) get distinct keys.

**Note:** Refresh still merges new `enrichedBySlug` entries into the global snapshot (shared corpus enrichment). This is intentional — story intelligence is shared infrastructure, not a personalized feed artifact.

---

## USER DATA

| Key | Contents | Writer | Readers |
|-----|----------|--------|---------|
| `yn:v3:user-intel:{userId}` | For You daily + weekly briefings, `profileFingerprint`, `updatedAt` | `writeUserIntelligenceSnapshot` on refresh | `loadUserIntelligenceSnapshot`, `loadPlatformDashboard`, `resolveBriefing` (for-you mode) |
| `yn:v2:user-profile:{userId}` | Topic preferences, saved story snapshots, reading signals | `patchUserProfile`, save/unsave actions | Ranking, signals, briefing selection, dashboard |
| Clerk `publicMetadata.onboarding` | Identity onboarding slice (interests, career, focus, tone) | Onboarding save | Profile resolution |

**Not persisted (computed at read time):**

| Logical artifact | How it is produced | Readers |
|------------------|-------------------|---------|
| For You feed (`user:{id}:feed`) | `rankStoriesForUser()` in `loadPlatformDashboard` | Web Dashboard, `GET /api/v1/dashboard`, signals API |
| Signals ranking (`user:{id}:signals`) | `buildSignalsDashboard()` from ranked stories + `UserIntelligenceProfile` | `GET /api/v1/signals`, web Signals tab |
| User Intelligence Profile | `buildUserIntelligenceOrNull()` from profile + saved + reading | Feed ranking, signals, briefing prompts |

---

## REFRESH PIPELINE

Entry points:
- Web: `refreshIntelligenceAction()` → `refreshPlatformIntelligence(profile)`
- Mobile/API: `POST /api/v1/intelligence/refresh` → `refreshPlatformIntelligence(profile, { userId })`
- Core: `runRefresh()` in `lib/intelligence/platform-snapshot.ts`

### What is regenerated (authenticated user refresh)

| Artifact | Regenerated? | Persisted? |
|----------|--------------|------------|
| Story pool (NewsAPI) | Yes | Global `yn:v1:story-pool` |
| Story intelligence batch | Yes (targets from user profile) | Merged into global `enrichedBySlug` |
| For You daily briefing | Yes | `yn:v3:user-intel:{userId}` |
| For You weekly briefing | Yes | `yn:v3:user-intel:{userId}` |
| Global daily briefing | **No** (preserved from previous snapshot) | Unchanged in global snapshot |
| Global weekly briefing | **No** (preserved from previous snapshot) | Unchanged in global snapshot |
| For You feed ranking | Recomputed on next dashboard fetch | Not persisted |
| Signals | Recomputed on next signals fetch | Not persisted |

### What is reused

- Global briefings (on user-scoped refresh)
- Existing `enrichedBySlug` entries (merged, not replaced)
- Shared story corpus and article bodies
- Per-user profile, saved stories, reading behavior (never touched by refresh)

### What is cached / invalidated

| Mechanism | Scope | Invalidation on refresh |
|-----------|-------|-------------------------|
| Platform intelligence snapshot | Global | Overwritten (enriched stories + preserved global briefings) |
| User intelligence snapshot | Per user | Overwritten for requesting user only |
| Weekly briefing KV cache | Per profile fingerprint | Not explicitly invalidated; new refresh writes snapshots directly with `force: true` |
| In-process refresh lock | Per userId (`__your_news_intelligence_refresh__:{userId}`) | Cleared when refresh completes |

### Logging

```
[REFRESH_INTELLIGENCE] {"userId":"...","keysWritten":["yn:v2:intelligence-snapshot","yn:v3:user-intel:..."],"keysInvalidated":[]}
[SNAPSHOT_SCOPE] global key=yn:v2:intelligence-snapshot
[SNAPSHOT_SCOPE] user-scoped userId=... key=yn:v3:user-intel:...
```

---

## BUG DETAIL (before fix)

```
User A presses Refresh Intelligence
  → runRefresh() generates for-you + global briefings
  → writePlatformIntelligenceSnapshot({ briefings: { daily: { for-you, global }, weekly: { for-you, global } } })
  → single global key overwritten

User B opens dashboard
  → readPlatformIntelligenceSnapshot()
  → briefingForMode(..., "for-you") reads platform.briefings.daily["for-you"]
  → User B sees User A's briefings
```

**Root cause files:**
- `lib/intelligence/platform-snapshot.ts` — monolithic snapshot write
- `lib/briefing/weekly-engine.ts` — `resolveBriefing()` read path used platform snapshot for for-you mode

---

## FIXES APPLIED

| Change | File(s) |
|--------|---------|
| New per-user snapshot store | `lib/persistence/user-intelligence-snapshot-persist.ts`, `lib/persistence/keys.ts` |
| User snapshot loader + legacy migration | `lib/intelligence/user-intelligence-load.ts` |
| Split refresh writes: global vs user | `lib/intelligence/platform-snapshot.ts` |
| Per-user refresh lock | `lib/intelligence/platform-snapshot.ts` |
| Dashboard reads for-you from user snapshot | `lib/intelligence/platform-snapshot.ts`, `app/page.tsx` |
| `resolveBriefing` reads for-you from user snapshot | `lib/briefing/weekly-engine.ts` |
| Preserve global briefings on user refresh | `lib/intelligence/platform-snapshot.ts` |
| Legacy migration: copy for-you from global snapshot if fingerprint matches | `lib/intelligence/user-intelligence-load.ts` |

### Legacy migration

On first read, if `yn:v3:user-intel:{userId}` is empty **and** the global snapshot's `profileFingerprint` matches the requesting user's fingerprint, for-you briefings are copied once into the user-scoped key. This prevents User B from inheriting User A's briefings (fingerprints differ for AI vs Markets profiles).

---

## VERIFICATION (two-user test)

### Setup

1. User A: complete onboarding with **AI** interests; save 2+ AI-related stories.
2. User B: complete onboarding with **Markets/Finance** interests; save 2+ finance stories.
3. Note each user's For You feed order, daily briefing headline, weekly briefing headline, and top 3 signals.

### Test

1. As User A, press **Refresh Intelligence** (web or mobile).
2. Wait for success.
3. As User A, reload — feed, briefings, and signals should change (or update timestamps/content).
4. As User B, reload **without** refreshing — feed, briefings, and signals should remain unchanged from step 3 baseline.

### Expected logs (User A refresh)

```
[INTELLIGENCE] user refresh — for-you briefings + story intelligence (global briefings preserved)
[SNAPSHOT_SCOPE] global key=yn:v2:intelligence-snapshot
[SNAPSHOT_SCOPE] user-scoped userId=user_A key=yn:v3:user-intel:user_A
[REFRESH_INTELLIGENCE] {"userId":"user_A","keysWritten":["yn:v2:intelligence-snapshot","yn:v3:user-intel:user_A"],"keysInvalidated":[]}
```

User B should **not** appear in `[REFRESH_INTELLIGENCE]` or `[SNAPSHOT_SCOPE] user-scoped` lines during User A's refresh.

---

## ARCHITECTURE vs REQUIRED MODEL

| Required key | Status |
|--------------|--------|
| Shared `stories:*` | ✅ `yn:v1:story-pool` |
| Shared `global:daily` / `global:weekly` | ✅ Global snapshot (preserved on user refresh) |
| Per-user `user:{id}:daily` / `user:{id}:weekly` | ✅ `yn:v3:user-intel:{userId}` |
| Per-user `user:{id}:feed` | ⚠️ Computed at read time, not persisted (no leak) |
| Per-user `user:{id}:signals` | ⚠️ Computed at read time, not persisted (no leak) |
| Per-user `user:{id}:profile` | ✅ `yn:v2:user-profile:{userId}` + Clerk |
| Per-user `user:{id}:saved` | ✅ Inside user profile record |
| Per-user `user:{id}:topicPreferences` | ✅ Inside user profile record |
| Per-user `user:{id}:readingBehavior` | ✅ Inside user profile record |

Persisting feed/signals snapshots per user remains a future performance optimization, not required for isolation.

---

## CONCLUSION

**The cross-user briefing leak was real** and is **fixed**. For You briefings are now stored and read from `yn:v3:user-intel:{userId}`. Feed and signals were already isolated by computation at read time. User refresh no longer overwrites global briefings or other users' data.
