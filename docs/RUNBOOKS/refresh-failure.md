# Runbook: Refresh Failure

## Symptoms

- `POST /api/v1/intelligence/refresh` returns 500 or times out
- Response: `{ "ok": false, "error": "..." }`
- Settings → Refresh Intelligence shows error on web/mobile
- Logs: `[API_V1] intelligence_refresh_failed`, AI provider errors, NewsAPI 429

## Diagnosis

1. Reproduce with curl (authenticated):
   ```bash
   curl -X POST -H "Authorization: Bearer $JWT" \
     https://your-app.vercel.app/api/v1/intelligence/refresh
   ```
2. Vercel function logs — duration, timeout at 300s?
3. Check Anthropic/OpenAI status and API key validity
4. Check NewsAPI quota: `NEWS_API_KEY` rate limits
5. Redis writable? (see [redis-down.md](./redis-down.md))
6. `AI_ALLOW_FALLBACK=true` — should partial-complete with templates; if false, fails hard

## Fix

### Function timeout

1. Confirm Vercel Pro 300s limit enabled
2. Reduce corpus size temporarily if ingest grew too large
3. Long-term: move refresh to background queue

### AI provider failure

1. Verify `ANTHROPIC_API_KEY` / billing
2. Switch `AI_PROVIDER=openai` if OpenAI configured (temporary)
3. Set `AI_ALLOW_FALLBACK=true` for degraded template mode

### NewsAPI failure

1. Verify API key and plan quota
2. Stale pool may still serve — check `meta.cacheStatus` on dashboard

### Redis write failure

1. Follow [redis-down.md](./redis-down.md)

### Partial success

Check response fields:
- `briefingUpdated: false` — briefing step failed
- `signalsUpdated: false` — signals step failed

Re-run refresh after fixing root cause.

## Prevention

- Rate limit refresh per user (recommended: 3/hour)
- Alert on refresh 500 rate > 5%
- Monitor Anthropic token usage

## Communication

> "Intelligence refresh couldn't complete. Your previous briefing is still available. Please try again in a few minutes."
