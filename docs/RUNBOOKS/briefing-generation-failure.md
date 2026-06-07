# Runbook: Briefing Generation Failure

## Symptoms

- Dashboard loads but briefings empty or show template/fallback copy
- For You sections have generic titles ("A Strategic Pattern Emerged…")
- `briefings.global.sections` length is 0
- `meta.hasIntelligenceSnapshot: false`
- Story intelligence shows metadata-only fallback text

## Diagnosis

1. Load dashboard API — inspect `briefings.global`, `briefings.forYou`
2. Check `meta.intelligenceUpdatedAt` — stale vs missing?
3. Vercel logs during last refresh — AI errors, parsing failures
4. Redis key `yn:v2:intelligence-snapshot` — exists and valid JSON?
5. For You quality: sections may be repaired on read — if still bad, corpus may be too thin
6. Review `AI_ALLOW_FALLBACK` — template mode vs hard failure

## Fix

### No snapshot exists

1. Run Refresh Intelligence (web settings or API POST)
2. Confirm Redis persistence configured

### AI output parse failure

1. Check logs for `[briefing]` parse errors
2. Retry refresh — transient model formatting issues
3. If persistent, inspect prompt changes in `lib/briefing/`

### Stale briefing after code deploy

1. Deploy fixes For You repair logic — cached snapshot may need refresh
2. Trigger refresh to regenerate with new quality gates

### Thin news corpus

1. NewsAPI returned few articles — check ingest logs
2. Wait for next refresh cycle or fix NewsAPI query params

### For You generic content

1. Ensure user completed onboarding (profile.completed)
2. Trigger refresh after topic preference changes
3. Verify `repair-for-you-sections.ts` running (dashboard read path)

## Prevention

- Monitor `hasIntelligenceSnapshot` false rate
- Unit tests on quality gates (`npm test`)
- Alert if global briefing sections < 1 after refresh

## Communication

> "Your briefing is updating. If content looks incomplete, tap Refresh Intelligence in Settings."
