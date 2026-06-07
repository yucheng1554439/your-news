# Runbook: Vercel Failure

## Symptoms

- Web app unreachable (502/503/504)
- All API v1 routes fail
- Vercel dashboard shows failed deployment or incident
- Build failures on push to main

## Diagnosis

1. Check [Vercel status](https://www.vercel-status.com/)
2. Vercel project → Deployments — latest status Ready vs Error
3. Function logs for runtime crashes
4. Build logs for compile errors
5. Domain/DNS issues if custom domain

## Fix

### Bad deployment

1. Vercel → Deployments → **Promote** previous working deployment
2. See [DEPLOYMENT.md](../DEPLOYMENT.md#rollback-process)

### Build failure

1. Read CI/build log — TypeScript, env missing at build time
2. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` required even for build in some setups
3. Fix code → push → redeploy

### Function crash loop

1. Identify route from logs (often `/intelligence/refresh` OOM/timeout)
2. Hotfix or disable feature flag
3. Rollback deployment

### Environment variable drift

1. Compare production env with `.env.example`
2. Restore missing vars → redeploy

### DNS / domain

1. Verify DNS points to Vercel
2. SSL certificate provisioning in Vercel domains tab

## Prevention

- GitHub Actions CI must pass before merge
- Deployment previews for PRs
- Uptime monitor on `/api/v1/health`

## Communication

> "Your News is temporarily unavailable. We're working to restore service."

Post-incident: note duration, root cause, and preventive action in team log.
