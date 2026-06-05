# Briefing Server/Client Boundary Fix

**Date:** 2026-06-03

## Offending import chain (before fix)

```
components/Dashboard.tsx          ("use client" via hooks)
  └─ hooks/use-briefing.ts        ("use client")
       └─ lib/weekly-briefing.ts
            └─ lib/briefing/weekly-selection.ts
                 └─ lib/briefing/briefing-corpus.ts  ("server-only" ❌)

hooks/use-briefing.ts
  └─ lib/briefing/types.ts
       └─ lib/briefing/weekly-rescue.ts
            └─ lib/briefing/weekly-selection.ts
                 └─ lib/briefing/briefing-corpus.ts  ("server-only" ❌)
```

Secondary client path:

```
components/HeroSection.tsx
  └─ lib/briefing/cadence.ts      (filterStoriesForCadence — server data)
  └─ lib/briefing/format-display.ts → types.ts → weekly-rescue → …
```

## Root causes

1. **`use-briefing.ts`** called `buildWeeklyBriefingSync()` on the client for fallback briefings.
2. **`types.ts`** imported `stripBriefingDiagnostics` from `weekly-rescue.ts`, pulling the server selection graph into any client type import.
3. **`cadence.ts`** mixed server pool filters with client UI label helpers.

## Fix summary

### Client-safe modules (new)

| File | Contents |
|------|----------|
| `lib/briefing/types.ts` | DTO types only — no server imports |
| `lib/briefing/shared/diagnostics.ts` | Pure diagnostic stripping |
| `lib/briefing/shared/normalize.ts` | `normalizeBriefing`, `briefingMatchesCadence` |
| `lib/briefing/shared/display.ts` | `formatBriefingForDisplay` |
| `lib/briefing/shared/cadence.ts` | `cadenceLabel`, `getPeriodLabel` |
| `lib/briefing/shared/empty-briefing.ts` | Client empty briefing placeholder |

### Server-only modules (marked `import "server-only"`)

- `lib/briefing/briefing-corpus.ts`
- `lib/briefing/weekly-selection.ts`
- `lib/briefing/weekly-pattern-selection.ts`
- `lib/briefing/weekly-intelligence-map.ts`
- `lib/briefing/enrich-selection.ts`
- `lib/briefing/provenance.ts`
- `lib/briefing/weekly-rescue.ts`
- `lib/briefing/personalized-weekly.ts`
- `lib/briefing/daily-selection.ts`
- `lib/briefing/cadence.ts` (pool filters)
- `lib/briefing/prompts.ts`
- `lib/briefing/weekly-engine.ts`
- `lib/weekly-briefing.ts`

### Client hook change

`hooks/use-briefing.ts` now only:
- Reads serialized briefings from `CadenceBriefings` (server-provided props)
- Normalizes via `shared/normalize`
- Falls back to `shared/empty-briefing` — **never** calls generation code

## Final dependency graph

```
CLIENT
├── hooks/use-briefing.ts
│   ├── lib/briefing/types.ts
│   ├── lib/briefing/shared/normalize.ts
│   │   ├── lib/briefing/types.ts
│   │   └── lib/briefing/shared/diagnostics.ts
│   └── lib/briefing/shared/empty-briefing.ts
│       ├── lib/briefing/types.ts
│       └── lib/briefing/shared/cadence.ts
├── components/Dashboard.tsx → types + use-briefing
├── components/HeroSection.tsx → types + shared/display + shared/cadence
└── components/BriefingProvenance.tsx → types

SERVER
├── lib/intelligence/platform-snapshot.ts
│   └── lib/weekly-briefing.ts → weekly-selection → briefing-corpus
├── lib/briefing/weekly-engine.ts
└── app/actions/briefing.ts → weekly-engine
```

## Verification

```bash
npx tsc --noEmit   # ✓ pass
npm run build      # ✓ pass
```
