# Security Review

Security assessment of Your News as of 2026-06-03. This is a living document for due diligence and engineering onboarding.

---

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Authentication | ✅ Strong | Clerk session + JWT verification |
| API authorization | ✅ Good | All v1 routes require auth except health |
| User isolation | ✅ Good | Key-scoped KV; verification script |
| Secrets handling | ⚠️ Moderate | Env vars; ensure Vercel/EAS secrets |
| Rate limiting | ❌ Missing | Refresh endpoint unbounded |
| Input validation | ⚠️ Moderate | Basic JSON checks; no schema library |
| CORS | ⚠️ Permissive | `Access-Control-Allow-Origin: *` |
| Data exposure | ⚠️ Low-Medium | Debug params in staging only |

---

## Authentication

**Provider:** Clerk

| Surface | Mechanism |
|---------|-----------|
| Web | Session cookies via `@clerk/nextjs` middleware |
| Mobile | `Authorization: Bearer` session JWT |
| Verification | `verifyToken(token, { secretKey })` in `lib/api/auth.ts` |

### Recommendations

- Enable Clerk bot protection and MFA options for high-risk accounts
- Rotate `CLERK_SECRET_KEY` on schedule
- Use separate Clerk instances for staging vs production

---

## API authorization

Every protected route calls `requireApiUser(req)` first. **userId is never taken from request body.**

```typescript
// lib/api/auth.ts — pattern
const authResult = await requireApiUser(req);
if (!authResult.ok) return apiError(..., 401);
// use authResult.userId only
```

### Gaps

- No role-based access control (admin vs user) — acceptable for current scope
- Debug query `debugIsolation=1` should be disabled in production or gated by env

**Recommendation:** Gate `debugIsolation` behind `DEBUG_ISOLATION=1` env var.

---

## JWT validation

Mobile tokens verified server-side with Clerk secret. Invalid/expired tokens return 401 without leaking validation details.

**Recommendation:** Log auth failures at warn level only (no token content in logs).

---

## User isolation

See [MULTI_TENANCY.md](./MULTI_TENANCY.md).

- Per-user KV keys with sanitized userId
- Global snapshots contain no PII
- `npm run verify:isolation` for regression testing

**Recommendation:** Run isolation script in CI with test Redis credentials (remove `continue-on-error`).

---

## Secrets handling

| Secret | Location |
|--------|----------|
| `CLERK_SECRET_KEY` | Vercel env only |
| `ANTHROPIC_API_KEY` | Vercel env only |
| `NEWS_API_KEY` | Vercel env only |
| Redis token | Vercel env only |
| `EXPO_PUBLIC_*` | Client bundle — publishable keys only |

### DO

- Use `.env.local` / EAS secrets — never commit
- Audit `.gitignore` covers `.env*`
- Use Vercel encrypted env for production

### DON'T

- Expose `CLERK_SECRET_KEY` or AI keys in mobile bundle
- Log full API keys or JWTs

---

## Rate limiting

**Current state:** No rate limits on API v1.

**Risk:** `POST /intelligence/refresh` is expensive (AI + ingest). Abuse could spike costs.

**Recommendations:**

1. Add Upstash Ratelimit — e.g. 3 refreshes / user / hour
2. Vercel WAF or middleware IP throttling on auth endpoints
3. NewsAPI quota monitoring

---

## Input validation

| Route | Validation |
|-------|------------|
| `PUT /profile/topics` | Requires `topicPreferences` object |
| `POST /profile/saved` | Requires `story.slug` + `story.headline` |
| `POST /intelligence/refresh` | Empty body OK |

**Recommendation:** Adopt Zod schemas shared between routes and mobile client for request/response validation.

---

## CORS

`lib/api/response.ts` sets `Access-Control-Allow-Origin: *`.

**Risk:** Any origin can call API from browser if attacker has user's JWT.

**Mitigations:**

- JWT is short-lived; not stored in cookies accessible to random origins on mobile
- Web uses same-origin cookies (not affected)

**Recommendation:** Restrict to known origins in production:

```typescript
"Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN ?? "https://yournews.app"
```

---

## Data exposure risks

| Risk | Mitigation |
|------|------------|
| Cross-user briefing leak | Per-user KV keys + isolation tests |
| AI prompt injection via article body | Quality gates strip artifacts; limit body length |
| Verbose error messages | Generic 500 messages to client |
| Debug endpoints | Dev-gated routes under `/api/debug` |

---

## Dependency security

Run periodically:

```bash
npm audit
cd mobile && npm audit
```

Address high/critical findings before production launch. Consider Dependabot.

---

## Incident response

1. Rotate compromised secrets in Vercel/EAS/Clerk
2. Redeploy application
3. Review Vercel function logs for anomalous refresh volume
4. Contact security@yournews.app (update contact)

---

## Pre-launch security checklist

- [ ] All secrets in Vercel/EAS — none in repo
- [ ] `debugIsolation` gated or removed in prod
- [ ] Rate limiting on refresh endpoint
- [ ] CORS restricted to production domains
- [ ] Clerk production hardened (OAuth redirect allowlist)
- [ ] Privacy policy describes data collected (Clerk, usage, saved stories)
- [ ] Isolation script passes in CI

---

## Related

- [MULTI_TENANCY.md](./MULTI_TENANCY.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
