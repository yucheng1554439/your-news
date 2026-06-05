# Briefing Corpus Regression Audit

**Date:** 2026-06-03  
**Issue:** Daily and weekly briefings were synthesized from a single event/cluster instead of the full cadence corpus.

---

## Root Cause (confirmed)

| Path | Bug | Location |
|------|-----|----------|
| Daily Global | Single **event cluster** only (`threads: [one cluster]`) | `selectDailyEventBriefing` in `daily-selection.ts` |
| Daily For You | Same + capped at **8 articles** per cluster | `enrich-selection.ts` `FOR_YOU_DAILY_MAX` |
| Daily prompt | `buildDailyDigest` used **`threads[0]` only** | `prompts.ts` |
| Daily rescue | `perThread = 1` when material empty | `weekly-selection.ts` |
| Weekly Global | Only **top 6 clusters** (`slice(0, 6)`) | `weekly-pattern-selection.ts` |
| Daily For You threads | Max **3 narrative threads** | `personalized-weekly.ts` THREAD_LIMITS |

Weekly For You was partially correct (full landscape digest) but daily was architecturally single-event.

---

## Expected vs Previous vs Fixed

| Briefing | Expected | Before | After |
|----------|----------|--------|-------|
| Global Daily | Full 24h corpus, all clusters | 1 event cluster | Full landscape via `buildWeeklyIntelligenceMap` |
| For You Daily | Same corpus as Global | 1 cluster, max 8 stories | Same pool; personalScore ranks clusters |
| Global Weekly | Full 7d corpus | Top 6 clusters | All clusters |
| For You Weekly | Same corpus as Global | OK (landscape) | Unchanged + thread cap removed |

---

## Generation Paths (after fix)

All four briefings flow through:

```
selectWeeklyBriefingSelection()
  → briefingCorpusForCadence()     # daily: 24h (expand 48h if thin); weekly: 7d
  → selectWeeklyPatternBriefing()
      → global: buildWeeklyIntelligenceMap (all clusters)
      → for-you: selectPersonalizedWeeklyThreads (same map, ranked)
  → expandSelectionToCorpusMinimum()  # target min 20 daily / 50 weekly
  → enrichBriefingSelection(corpus)   # full cluster story coverage
  → buildWeeklyBriefingPrompt()       # full landscape digest for ALL modes
  → LLM / fallback
```

Entry points:
- `resolveBriefing()` — `lib/briefing/weekly-engine.ts`
- `buildWeeklyBriefingSync()` — `lib/weekly-briefing.ts`
- `refreshPlatformIntelligence()` — `lib/intelligence/platform-snapshot.ts`

---

## Logging (before LLM)

```
[BRIEFING_CORPUS] daily/global — storiesProcessed=N sourcesProcessed=N narrativesProcessed=N signalsProcessed=N corpusPool=M
```

Also retained for daily:
```
[DAILY] pre-call · global — selectedStories=...
```

Regression guard:
```
[BRIEFING_CORPUS] REGRESSION daily/global — only 1 article in synthesis despite corpus=M
```

---

## Provenance (displayed on briefing UI)

Extended `BriefingProvenance`:

| Field | Meaning |
|-------|---------|
| `storiesProcessed` | Unique articles in synthesis material |
| `sourcesProcessed` | Distinct outlets |
| `narrativesProcessed` | Narrative clusters in prompt |
| `signalsProcessed` | Active desk signals in corpus |

Shown on:
- Web: `components/BriefingProvenance.tsx`
- Mobile: `mobile/src/components/briefing/BriefingView.tsx` (Source Coverage)

Legacy fields `articleCount`, `narrativeCount`, `sourceCount` remain for API compatibility.

---

## Corpus Minimums

```typescript
BRIEFING_CORPUS_MIN = { daily: 20, weekly: 50 }
```

When clustering yields fewer unique articles than the minimum but the cadence pool is larger, `expandSelectionToCorpusMinimum()` adds ranked stories in a coverage thread.

Single-article synthesis only occurs when the cadence pool itself has one story.

---

## Files Changed

| File | Change |
|------|--------|
| `lib/briefing/briefing-corpus.ts` | **NEW** — pool filters, minimums, signal count, logging |
| `lib/briefing/weekly-pattern-selection.ts` | Unified daily+weekly landscape; all clusters |
| `lib/briefing/weekly-selection.ts` | Daily uses pattern path; corpus min rescue |
| `lib/briefing/daily-selection.ts` | Deprecated event model; re-exports landscape |
| `lib/briefing/enrich-selection.ts` | Removed For You daily 8-story cap |
| `lib/briefing/personalized-weekly.ts` | Removed thread count caps |
| `lib/briefing/prompts.ts` | Full landscape digest for daily + weekly |
| `lib/briefing/provenance.ts` | Extended provenance fields |
| `lib/briefing/types.ts` | Provenance type |
| `lib/briefing/cadence.ts` | Weekly 7-day window filter |
| `lib/briefing/weekly-engine.ts` | Corpus audit logging |
| `components/BriefingProvenance.tsx` | Display synthesis stats |
| `mobile/.../BriefingView.tsx` | Display synthesis stats |

---

## Verification

After refresh, check logs for:
```
[BRIEFING_CORPUS] daily/global — storiesProcessed=20+ ...
[BRIEFING_CORPUS] weekly/for-you — storiesProcessed=50+ ...
```

Briefing UI should show multi-story provenance (not `1 story · 1 narrative` unless corpus is truly thin).

Compare Global vs For You daily: `storiesProcessed` should match; only interpretation differs.
