# Your News Mobile API (v1)

Base URL: `https://your-domain.com/api/v1` (local: `http://localhost:3000/api/v1`)

## Authentication

All endpoints except `GET /health` require authentication:

```
Authorization: Bearer <clerk_session_jwt>
```

Web clients may also use Clerk session cookies on same-origin requests.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health + persistence status |
| GET | `/dashboard` | Full dashboard payload (feed, briefings, UIP, sections) |
| GET | `/profile/topics` | Topic preferences (more / less / never) |
| PUT | `/profile/topics` | Save topic preferences |
| GET | `/profile/saved` | Saved story refs (synced with web) |
| POST | `/profile/saved` | Toggle save — body: `{ story }` — persists full intelligence snapshot |
| GET | `/profile/intelligence` | User intelligence profile (themes, behavior, preferences) |
| GET | `/signals` | Signal momentum desk (rising / falling, relevance, related stories) |
| POST | `/intelligence/refresh` | Regenerate intelligence (ingest, rankings, briefings, story AI) — same as web Refresh Intelligence |

### GET /health

Public. No auth.

### GET /dashboard

Returns personalized feed, global stories, briefings, user intelligence profile, and precomputed section slugs.

### PUT /profile/topics

Body:

```json
{
  "topicPreferences": {
    "moreOf": ["ai", "markets"],
    "lessOf": ["sports"],
    "neverShow": ["entertainment"]
  }
}
```

Validation errors return `400` with `{ ok: false, error, category, code }`.

### POST /intelligence/refresh

Triggers the same `refreshPlatformIntelligence` workflow as the web **Refresh Intelligence** control: NewsAPI ingest, editorial cognition, daily/weekly briefings, story intelligence batch, and snapshot persistence. Signals and feed rankings update on the next dashboard/signals fetch.

Response:

```json
{
  "ok": true,
  "refreshedAt": 1710000000000,
  "storiesProcessed": 48,
  "storiesAdded": 6,
  "dailyUpdated": true,
  "weeklyUpdated": true,
  "signalsUpdated": true
}
```

On failure, `ok` is `false`, HTTP `500`, and `error` describes the issue (e.g. Redis not configured).

## Mobile app

Expo app scaffold: `mobile/` — see `mobile/README.md`.

## Architecture

- **Domain logic:** `lib/` (unchanged, shared with web)
- **HTTP layer:** `lib/api/` + `app/api/v1/`
- **Services:** `lib/services/` (used by Server Actions and REST routes)
