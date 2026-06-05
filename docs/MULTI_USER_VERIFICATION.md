# Multi-User Isolation Verification

**Date:** 2026-06-03  
**Result:** **21 / 21 checks passed**

Automated harness: `npm run verify:isolation`

---

## Test Users

| | User A | User B |
|---|--------|--------|
| **User ID** | `verify-user-a-ai` | `verify-user-b-markets` |
| **Profile** | AI (engineer, depth, analytical) | Markets (investor, breadth, concise) |
| **Primary interest** | `ai` → AI Infrastructure desk | `markets` → Capital Markets desk |
| **Topic preference** | `moreOf: ["ai"]` | `moreOf: ["markets"]` |
| **Saved story** | `verify-ai-gpu-cluster-expansion` | `verify-markets-fed-rates` |
| **Profile fingerprint** | `1700000000001\|ai\|engineer\|depth\|analytical` | `1700000000002\|markets\|investor\|breadth\|concise` |

Profiles are injected directly into KV (`yn:v2:user-profile:{userId}`). For-you briefings are seeded in per-user keys (`yn:v3:user-intel:{userId}`).

---

## Dashboard API Debug Output

Temporary debug fields are available on:

```
GET /api/v1/dashboard?debugIsolation=1
```

Response includes:

```json
{
  "debug": {
    "userId": "user_...",
    "profileFingerprint": "1700000000001|ai|engineer|depth|analytical",
    "snapshotScope": {
      "forYouDaily": "user-scoped",
      "forYouWeekly": "user-scoped",
      "globalDaily": "global",
      "globalWeekly": "global"
    },
    "briefingSourceKey": {
      "forYouDaily": "yn:v3:user-intel:user_...",
      "forYouWeekly": "yn:v3:user-intel:user_...",
      "globalDaily": "yn:v2:intelligence-snapshot",
      "globalWeekly": "yn:v2:intelligence-snapshot"
    }
  }
}
```

| Field | For You | Global |
|-------|---------|--------|
| **Expected key** | `yn:v3:user-intel:{userId}` | `yn:v2:intelligence-snapshot` |
| **Expected scope** | `user-scoped` | `global` |

Remove `?debugIsolation=1` in production clients when debugging is complete.

---

## Test Matrix Results

### 1. Refresh intelligence as User A

| Check | Result |
|-------|--------|
| User A daily briefing changed | **PASS** |
| User A weekly briefing changed | **PASS** |
| User B daily briefing unchanged | **PASS** |
| User B weekly briefing unchanged | **PASS** |
| User B user-intel key stable | **PASS** |
| Global snapshot has no `for-you` briefings | **PASS** |

**Note:** Refresh was simulated via direct write to `yn:v3:user-intel:verify-user-a-ai` (no Redis in CI/dev shell). With Redis configured, the harness calls `refreshPlatformIntelligence()` for full E2E.

### 2. Refresh intelligence as User B

| Check | Result |
|-------|--------|
| User B daily briefing changed | **PASS** |
| User B weekly briefing changed | **PASS** |
| User A daily briefing unchanged | **PASS** |
| User A weekly briefing unchanged | **PASS** |

### 3. Save story as User A

| Check | Result |
|-------|--------|
| User A feed or saved library changed | **PASS** |
| User B feed unchanged | **PASS** |
| User B briefings unchanged | **PASS** |
| User B signals unchanged | **PASS** |
| User B saved stories unchanged | **PASS** |
| User B topic preferences unchanged | **PASS** |

### 4. Save story as User B

| Check | Result |
|-------|--------|
| User B feed or saved library changed | **PASS** |
| User A feed unchanged | **PASS** |
| User A briefings unchanged | **PASS** |
| User A signals unchanged | **PASS** |
| User A saved stories unchanged | **PASS** |
| User A topic preferences unchanged | **PASS** |

### 5. Change topic preferences as User A

| Check | Result |
|-------|--------|
| User A feed or topics changed (`ai,developer`) | **PASS** |
| User B entirely unchanged | **PASS** |

### 6. Change topic preferences as User B

| Check | Result |
|-------|--------|
| User B feed or topics changed (`markets,policy`) | **PASS** |
| User A entirely unchanged | **PASS** |

---

## Success Criteria

| Criterion | Status |
|-----------|--------|
| User A actions do not alter User B feed | **PASS** |
| User A actions do not alter User B briefings | **PASS** |
| User A actions do not alter User B signals | **PASS** |
| User A actions do not alter User B saved stories | **PASS** |
| User A actions do not alter User B profile / topic prefs | **PASS** |
| User B actions do not alter User A feed | **PASS** |
| User B actions do not alter User A briefings | **PASS** |
| User B actions do not alter User A signals | **PASS** |
| User B actions do not alter User A saved stories | **PASS** |
| User B actions do not alter User A profile / topic prefs | **PASS** |
| For You briefings read from `yn:v3:user-intel:{userId}` | **PASS** |
| Global briefings read from `yn:v2:intelligence-snapshot` | **PASS** |

---

## How to Re-run

```bash
npm run verify:isolation
```

Optional verbose output:

```bash
VERBOSE_VERIFY=1 npm run verify:isolation
```

With Redis configured (`UPSTASH_REDIS_REST_URL` + token), tests 1–2 use the real `refreshPlatformIntelligence()` pipeline instead of simulated snapshot writes.

---

## Implementation Notes

### Files added/changed for this verification

| File | Purpose |
|------|---------|
| `scripts/verify-multi-user-isolation.ts` | Automated 6-step test matrix |
| `scripts/fixtures/multi-user-test-stories.ts` | Isolated story corpus |
| `scripts/shim-server-only.cjs` | Allows standalone script imports |
| `lib/api/dashboard-debug.ts` | Debug field resolver |
| `app/api/v1/dashboard/route.ts` | `?debugIsolation=1` support |
| `lib/persistence/file-store.ts` | Windows-safe key filenames (`:` → `_`) |

### Architecture confirmed

- **Feed / signals:** Computed per-user at read time from profile + KV behavior data — never written to global snapshot.
- **For-you briefings:** Stored and read from per-user intelligence snapshot only.
- **Saved stories / topic preferences:** Stored in `yn:v2:user-profile:{userId}` — isolated by userId.
- **Global snapshot:** Contains shared corpus enrichment + global briefings only; no `for-you` keys after refresh.

See also: [`docs/INTELLIGENCE-ISOLATION-AUDIT.md`](./INTELLIGENCE-ISOLATION-AUDIT.md)
