# Briefing Provenance Trace

End-to-end path for each briefing type and where provenance is logged.

## Code paths

| Briefing | Refresh | Snapshot write | Snapshot read | API | Mobile |
|----------|---------|----------------|---------------|-----|--------|
| Global Daily | `runRefresh` → `resolveBriefing(..., global, daily)` | `yn:v2:intelligence-snapshot` → `briefings.daily.global` | `loadPlatformDashboard` → `briefingForMode(..., global, daily)` | `GET /api/v1/dashboard` → `serializeDashboardResponse` | `useDashboard` → `BriefingView` |
| For You Daily | `runRefresh` → `resolveBriefing(..., for-you, daily, userId)` | `yn:v3:user-intel:{userId}` → `briefings.daily.for-you` | `briefingForMode` reads user snapshot | same | same |
| Global Weekly | same pattern, `cadence: weekly` | `briefings.weekly.global` | same | same | same |
| For You Weekly | same, user snapshot | `briefings.weekly.for-you` | same | same | same |

### Refresh Intelligence

```
refreshPlatformIntelligence
  → runRefresh (platform-snapshot.ts)
    → resolveBriefing (weekly-engine.ts) — AI or sync generation
    → pickBriefingForSnapshot — rejects generated/prior if below threshold
    → preserveGlobalBriefing — rejects stale global on user-scoped refresh
    → logPlatformSnapshotWriteProvenance + writePlatformIntelligenceSnapshot
    → writeUserIntelligenceSnapshot (for-you only)
```

### Corpus selection

```
rankedBase (full editorial pool)
  → briefingCorpusForCadence(corpus, cadence)
    → daily: 24h window, expand to 48h if thin
    → weekly: filterStoriesForCadence(corpus, "weekly")
  → selectWeeklyBriefingSelection + enrichBriefingSelection
  → buildProvenanceFromSelection
```

## Guardrails

Minimum `storiesProcessed` when corpus allows:

| Cadence | Minimum |
|---------|---------|
| Daily | 20 |
| Weekly | 50 |

Exception: when `corpusPool <= 1`, only 1 story is required. When `corpusPool < minimum`, briefing must use at least `corpusPool` stories.

When a cached or preserved briefing fails the threshold, the system:

1. Logs `[BRIEFING_REGRESSION]` with phase, cadence, mode, stats, and `corpusPool`
2. Regenerates via `buildWeeklyBriefingSync` (full landscape selection)
3. Never writes sub-threshold briefings to snapshot when a valid sync fallback exists

## Log tags

Search server logs for:

- `[BRIEFING_PROVENANCE]` — normal provenance at each phase
- `[BRIEFING_REGRESSION]` — briefing below threshold when corpus allows more

Phases: `generation`, `snapshot-write`, `snapshot-read`, `snapshot-read-rejected`, `preserve-rejected`, `api-response`

Each log includes:

```json
{
  "phase": "snapshot-read",
  "cadence": "weekly",
  "mode": "global",
  "storiesProcessed": 52,
  "sourcesProcessed": 18,
  "narrativesProcessed": 4,
  "signalsProcessed": 3,
  "corpusPool": 120,
  "generatedBy": "fallback"
}
```

## Root cause: stale snapshots (fixed)

Before corpus expansion, weekly briefings were written with `storiesProcessed: 1`. Two paths kept serving them:

1. **`briefingForMode`** returned cached snapshot without re-validating provenance
2. **`preserveGlobalBriefing`** on user-scoped refresh copied old global briefings verbatim

Both now reject sub-threshold provenance and regenerate from the full corpus.

## Verification

After **Refresh Intelligence**:

1. Check logs for `[BRIEFING_PROVENANCE]` at `generation`, `snapshot-write`, `api-response`
2. Confirm `storiesProcessed >= 50` for weekly when `corpusPool >= 50`
3. Mobile briefing metadata should match server logs for the same cadence/mode

Force a read without refresh: `GET /api/v1/dashboard` still runs guardrails in `briefingForMode` — stale cached briefings regenerate on read.
