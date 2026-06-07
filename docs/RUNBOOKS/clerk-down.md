# Runbook: Clerk Down

## Symptoms

- All authenticated routes return 401
- Web: redirect loop or blank sign-in
- Mobile: "Authentication required" on every API call
- Clerk dashboard shows incident or elevated error rate
- Logs: `verifyToken` failures, Clerk API timeouts

## Diagnosis

1. Check [Clerk status](https://status.clerk.com/)
2. Verify env vars: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
3. Confirm keys match same Clerk instance (test vs live mismatch common)
4. Web: browser devtools → Clerk session cookie present?
5. Mobile: token refresh failing in Clerk SDK logs

## Fix

### Clerk incident

1. Monitor Clerk status page
2. No code fix — wait for recovery
3. Optionally show maintenance banner (manual deploy)

### Wrong keys deployed

1. Compare Vercel env with Clerk dashboard
2. Update keys → redeploy
3. Mobile: update EAS `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` if changed

### JWT clock skew / expiry

1. Ensure device time is correct (mobile)
2. Force sign-out and sign-in to refresh session

### OAuth redirect misconfiguration

1. Clerk dashboard → OAuth → allowed redirect URLs
2. Add missing Expo/production URLs

## Prevention

- Separate staging/production Clerk apps
- Monitor 401 rate spike on API v1
- Document key rotation procedure

## Communication

> "Sign-in is temporarily unavailable due to an authentication provider issue. Please try again shortly."
