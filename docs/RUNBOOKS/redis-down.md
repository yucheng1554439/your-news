# Runbook: Redis Down

## Symptoms

- `GET /api/v1/health` returns `redisConfigured: false` or `remoteConfigured: false`
- Dashboard loads empty stories or template fallbacks
- Logs: Redis connection errors, KV timeout, `fromPersistentStore: false`
- Intelligence refresh fails with persistence errors
- Vercel logs: `UPSTASH_REDIS_REST_URL` missing or 401 from Upstash

## Diagnosis

1. Check health endpoint:
   ```bash
   curl https://your-app.vercel.app/api/v1/health
   ```
2. Verify Vercel env vars: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
3. Upstash console — database status, quota, connection count
4. Test REST manually:
   ```bash
   curl -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" \
     "$UPSTASH_REDIS_REST_URL/get/yn:v1:story-pool"
   ```
5. Confirm `NEWS_FILE_PERSISTENCE` is **not** enabled in production (file fallback won't work on Vercel)

## Fix

### Env misconfiguration

1. Restore correct Upstash URL/token in Vercel → Settings → Environment Variables
2. Redeploy (or trigger redeploy without code change)

### Upstash outage

1. Check [Upstash status](https://status.upstash.com/)
2. Wait for recovery; communicate ETA to users
3. If prolonged, consider failover Redis (restore from backup to new DB, update env)

### Quota exceeded

1. Upstash console → upgrade plan or increase limits
2. Audit key sizes — story pool bloat; trim if needed

### Data corruption

1. Restore from Upstash backup (if enabled)
2. Trigger **Refresh Intelligence** after restore to rebuild snapshots

## Prevention

- Uptime monitor on `/api/v1/health` every 60s
- Alert when `redisConfigured: false` in production
- Separate staging Redis from production

## Communication

> "We're experiencing a data connectivity issue. Your account is secure. Briefings may be temporarily unavailable while we restore service."
