# API Reference (v1)

Base path: `/api/v1`  
Version constant: `v1`  
Content-Type: `application/json`  
CORS: Enabled (`Access-Control-Allow-Origin: *`)

---

## Authentication

All routes except **health** require authentication.

| Client | Method |
|--------|--------|
| Web | Clerk session cookie (same origin) |
| Mobile | `Authorization: Bearer <clerk_session_jwt>` |

Implementation: `lib/api/auth.ts` → `requireApiUser()`.

### Auth errors

| Status | Body |
|--------|------|
| 401 | `{ "ok": false, "error": "Authentication required" }` |
| 401 | `{ "ok": false, "error": "Invalid or expired token" }` |

---

## Common response shapes

**Success wrapper (most routes):** `{ "ok": true, ... }`  
**Error wrapper:** `{ "ok": false, "error": string }`

**OPTIONS:** `204 No Content` with CORS headers.

---

## GET /health

Public health check.

| | |
|---|---|
| **Auth** | None |
| **Method** | `GET`, `OPTIONS` |

### Response 200

```json
{
  "ok": true,
  "version": "v1",
  "service": "your-news",
  "timestamp": 1717430400000,
  "persistence": {
    "redisConfigured": true,
    "remoteConfigured": true
  }
}
```

### Example

```bash
curl https://your-app.vercel.app/api/v1/health
```

---

## GET /dashboard

Full dashboard payload: stories, briefings, UIP, feed section slugs, meta.

| | |
|---|---|
| **Auth** | Required |
| **Method** | `GET`, `OPTIONS` |
| **Query** | `debugIsolation=1` — optional isolation debug block (dev/staging) |

### Response 200

```json
{
  "ok": true,
  "version": "v1",
  "profile": { "completed": true, "interests": [], "career": "", "preferences": {} },
  "stories": [/* Story[] — personalized pool */],
  "globalStories": [/* Story[] — global pool */],
  "userIntelligence": { /* UserIntelligenceProfile | null */ },
  "briefings": {
    "global": { /* IntelligenceBriefing */ },
    "forYou": { /* IntelligenceBriefing | null */ }
  },
  "sections": {
    "leadSlug": "story-slug",
    "relevantSlugs": [],
    "topSlugs": [],
    "moreStoriesSlugs": []
  },
  "meta": {
    "fetchedAt": 1717430400000,
    "intelligenceUpdatedAt": 1717430000000,
    "hasIntelligenceSnapshot": true,
    "persistenceConfigured": true,
    "cacheStatus": "fresh",
    "feedError": null,
    "fromPersistentStore": true
  }
}
```

### Errors

| Status | Reason |
|--------|--------|
| 401 | Not authenticated |
| 500 | `{ "ok": false, "error": "Failed to load dashboard" }` |

### Example (mobile)

```bash
curl -H "Authorization: Bearer $CLERK_JWT" \
  https://your-app.vercel.app/api/v1/dashboard
```

---

## GET /signals

Momentum-ranked signals for the authenticated user.

| | |
|---|---|
| **Auth** | Required |
| **Method** | `GET`, `OPTIONS` |

### Response 200

```json
{
  "ok": true,
  "signals": [
    {
      "id": "cluster-id",
      "title": "AI Infrastructure Spending",
      "momentum": 0.82,
      "storyCount": 5,
      "explanation": "…",
      "stories": [/* Story refs */]
    }
  ]
}
```

### Errors

| Status | Reason |
|--------|--------|
| 401 | Not authenticated |
| 500 | Failed to load signals |

---

## GET /profile/topics

Load topic preferences.

### Response 200

```json
{
  "ok": true,
  "topicPreferences": {
    "boosted": ["technology", "markets"],
    "muted": ["sports"]
  }
}
```

---

## PUT /profile/topics

Update topic preferences.

### Request

```json
{
  "topicPreferences": {
    "boosted": ["technology"],
    "muted": []
  }
}
```

### Response 200

```json
{
  "ok": true,
  "topicPreferences": { "boosted": ["technology"], "muted": [] }
}
```

### Errors

| Status | Reason |
|--------|--------|
| 400 | Invalid JSON or missing `topicPreferences` |
| 401 | Not authenticated |
| 500 | Save failed |

---

## GET /profile/saved

List saved stories for the user.

### Response 200

```json
{
  "ok": true,
  "items": [/* SavedStoryItem[] with embedded Story */]
}
```

---

## POST /profile/saved

Toggle save state for a story.

### Request

```json
{
  "story": {
    "slug": "example-story",
    "headline": "Example Headline",
    "summary": "…",
    "source": "Reuters",
    "category": "technology",
    "publishedAt": "2026-06-04T12:00:00.000Z"
  }
}
```

Required fields: `slug`, `headline`.

### Response 200

```json
{
  "ok": true,
  "saved": true,
  "items": [/* updated list */]
}
```

---

## GET /profile/intelligence

User Intelligence Profile (UIP) summary for settings screen.

### Response 200

Serialized UIP payload from `getProfileIntelligenceForUserId`.

### Errors

| Status | Reason |
|--------|--------|
| 404 | Onboarding incomplete |
| 401 | Not authenticated |
| 500 | Server error |

---

## POST /intelligence/refresh

Regenerate global + user intelligence (ingest, briefings, signals). Long-running (up to 300s).

| | |
|---|---|
| **Auth** | Required |
| **Method** | `POST`, `OPTIONS` |
| **Body** | Empty |

### Response 200 / 500

```json
{
  "ok": true,
  "refreshedAt": 1717430400000,
  "storiesProcessed": 42,
  "storiesAdded": 3,
  "briefingUpdated": true,
  "signalsUpdated": true
}
```

On partial failure, `ok: false` and `error` string may be present (HTTP 500).

### Example

```bash
curl -X POST -H "Authorization: Bearer $CLERK_JWT" \
  https://your-app.vercel.app/api/v1/intelligence/refresh
```

---

## DELETE /profile/account

Permanently delete the authenticated user's account and stored data (Apple Guideline 5.1.1(v)).

| | |
|---|---|
| **Auth** | Required |
| **Method** | `DELETE`, `OPTIONS` |
| **Body** | Empty |

### Response 200

```json
{
  "ok": true,
  "deleted": true
}
```

### Errors

| Status | Reason |
|--------|--------|
| 401 | Not authenticated |
| 500 | Persistence or Clerk deletion failure (`stage` field may be present) |

### Example

```bash
curl -X DELETE -H "Authorization: Bearer $CLERK_JWT" \
  https://your-app.vercel.app/api/v1/profile/account
```

---

## Briefings (embedded)

Briefings are **not** standalone API routes. They are returned inside `GET /dashboard` under `briefings.global` and `briefings.forYou`.

Each `IntelligenceBriefing` includes:

- `cadence` — `"daily"` | `"weekly"`
- `periodLabel` — corpus-derived coverage label
- `coverageDateMs` — UTC midnight of primary coverage day
- `sections[]` — headline, body, watch, action
- `updatedAt` — generation timestamp

Web also renders briefings via server components reading the same platform snapshot.

---

## Stories by slug (web route)

There is **no** `GET /api/v1/stories/:slug` today.

| Surface | Path |
|---------|------|
| Web SSR | `/story/[slug]` |
| Mobile | Story object from dashboard cache or navigation params |

**Recommendation:** Add `GET /api/v1/stories/:slug` for mobile deep links without full dashboard reload.

---

## Legacy / internal routes

| Path | Purpose |
|------|---------|
| `/api/persistence/health` | Internal persistence probe |
| `/api/ai/health` | AI provider connectivity |
| `/api/debug/*` | Dev-gated debugging |

Not part of the public mobile contract.

---

## Error catalog

| HTTP | Typical cause |
|------|----------------|
| 400 | Malformed JSON, missing required body fields |
| 401 | Missing/invalid auth |
| 404 | Resource not found (e.g. incomplete onboarding) |
| 500 | Intelligence refresh failure, KV errors, unhandled exceptions |

---

## Related

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [MOBILE_ARCHITECTURE.md](./MOBILE_ARCHITECTURE.md) — client usage
- [SECURITY.md](./SECURITY.md) — auth hardening
