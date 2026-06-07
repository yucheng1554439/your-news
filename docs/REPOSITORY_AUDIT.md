# Repository Audit

**Date:** 2026-06-03  
**Scope:** Web, mobile, API v1, intelligence engine, persistence, auth, CI/CD, documentation, launch readiness

---

## Present — What Already Exists

### Root & tooling

| Item | Status |
|------|--------|
| Next.js 16 monorepo-style layout (`app/`, `lib/`, `components/`) | ✅ |
| Expo mobile app (`mobile/`) | ✅ |
| TypeScript strict mode | ✅ |
| ESLint (Next.js config) | ✅ |
| `.env.example` | ✅ (expanded) |
| Multi-user isolation script (`npm run verify:isolation`) | ✅ |
| Vitest + example unit tests | ✅ (added) |
| GitHub Actions CI | ✅ (added) |
| Issue/PR templates | ✅ (added) |
| LICENSE, CONTRIBUTING, CHANGELOG, CODE_OF_CONDUCT | ✅ (added) |

### Web application

| Item | Status |
|------|--------|
| Clerk auth + middleware | ✅ |
| Onboarding flow (interests, career, preferences) | ✅ |
| Dashboard with feed, briefings, story detail | ✅ |
| Settings (topics, intelligence refresh) | ✅ |
| Premium editorial UI (Tailwind v4, shadcn, Framer Motion) | ✅ |

### Mobile application

| Item | Status |
|------|--------|
| Expo Router file-based navigation | ✅ |
| Clerk auth (sign-in, sign-up, Google OAuth) | ✅ |
| Tab navigation: Home, Briefings, Signals, Saved, Settings | ✅ |
| API v1 client + hooks | ✅ |
| Intelligence refresh control | ✅ |
| Saved stories provider | ✅ |

### API v1

| Route | Status |
|-------|--------|
| `GET /api/v1/health` | ✅ |
| `GET /api/v1/dashboard` | ✅ |
| `GET /api/v1/signals` | ✅ |
| `GET/PUT /api/v1/profile/topics` | ✅ |
| `GET/POST /api/v1/profile/saved` | ✅ |
| `GET /api/v1/profile/intelligence` | ✅ |
| `POST /api/v1/intelligence/refresh` | ✅ |
| CORS + Bearer JWT auth | ✅ |

### Intelligence engine

| Item | Status |
|------|--------|
| NewsAPI ingest + story pool cache | ✅ |
| Global daily briefing generation | ✅ |
| For You personalized briefing | ✅ |
| Story intelligence (per-article) | ✅ |
| Signals / momentum scoring | ✅ |
| User Intelligence Profile (UIP) | ✅ |
| Refresh intelligence pipeline | ✅ |
| For You quality gates + corpus narratives | ✅ |
| Coverage period from corpus dates | ✅ |
| Platform snapshot (dashboard assembly) | ✅ |

### Persistence

| Item | Status |
|------|--------|
| Redis/KV via Upstash | ✅ |
| File fallback for local dev | ✅ |
| Versioned key prefixes (`yn:v1`, `yn:v2`, `yn:v3`) | ✅ |
| Per-user snapshot keys | ✅ |
| Isolation audit docs | ✅ |

### Documentation (prior)

| Doc | Status |
|-----|--------|
| `docs/MOBILE.md` | ✅ |
| `docs/MULTI_USER_VERIFICATION.md` | ✅ |
| `docs/INTELLIGENCE-ISOLATION-AUDIT.md` | ✅ |
| Briefing provenance / corpus audits | ✅ |

---

## Missing — What Should Exist But Didn't (Now Addressed)

| Gap | Resolution |
|-----|------------|
| Root README outdated ("mock data") | ✅ Rewritten |
| No architecture / API / deployment docs | ✅ `docs/ARCHITECTURE.md`, `API.md`, `DEPLOYMENT.md` |
| No intelligence engine deep-dive | ✅ `docs/INTELLIGENCE_ENGINE.md` |
| No multi-tenancy guide | ✅ `docs/MULTI_TENANCY.md` |
| No operational runbooks | ✅ `docs/RUNBOOKS/` |
| No CI/CD | ✅ `.github/workflows/ci.yml` |
| No automated unit tests | ✅ Vitest + `tests/unit/` |
| No contributor templates | ✅ CONTRIBUTING, issue/PR templates |
| No App Store checklist | ✅ `docs/APP_STORE_CHECKLIST.md` |
| No security review doc | ✅ `docs/SECURITY.md` |
| No readiness report | ✅ `docs/PROJECT_READINESS_REPORT.md` |
| Marketing screenshots | ⚠️ Placeholders only |
| Privacy policy / terms URLs | ⚠️ Not in repo (required for App Store) |
| Rate limiting on API | ⚠️ Not implemented |
| E2E tests (Playwright/Detox) | ⚠️ Not implemented |
| Sentry / analytics wiring | ⚠️ Env placeholders only |
| Dedicated `/api/v1/stories/:slug` | ⚠️ Stories served via dashboard payload; web uses SSR route |

---

## Recommendations — High-Priority Improvements

### P0 — Before App Store launch

1. **Legal pages** — Host privacy policy, terms of service, and support URL; link from mobile settings and App Store Connect.
2. **Production env audit** — Verify all Vercel + EAS secrets; disable `NEWS_FILE_PERSISTENCE` in production.
3. **App assets** — Final app icon, splash screen, and store screenshots in `docs/assets/`.
4. **EAS submit config** — Fill `appleId`, `ascAppId`, `appleTeamId` in `mobile/eas.json`.

### P1 — Before external contributors / acquisition review

5. **Rate limiting** — Add Upstash Ratelimit or middleware limits on `/api/v1/intelligence/refresh`.
6. **Observability** — Sentry for web/mobile/API; structured logging for refresh failures.
7. **E2E tests** — Playwright for web auth + dashboard; Detox or Maestro for mobile smoke.
8. **API stories endpoint** — Optional `GET /api/v1/stories/:slug` for mobile deep links without full dashboard fetch.
9. **Staging environment** — Separate Vercel project + Redis namespace for QA.

### P2 — Scalability & polish

10. **Background refresh** — Cron or queue for intelligence refresh instead of user-triggered only.
11. **Database for user events** — Move high-volume behavior tracking off KV if needed.
12. **Documentation assets** — Real architecture screenshots and demo video for investors.
13. **Dependency audit** — Address `npm audit` findings in CI.

---

## Repository structure scorecard

| Area | Maturity |
|------|----------|
| Code organization | Strong — clear `lib/` domains |
| Mobile parity | Good — API v1 covers core flows |
| Test coverage | Early — unit examples only |
| CI/CD | Basic — lint, tsc, test, build |
| Documentation | Good — comprehensive docs added |
| Security hardening | Moderate — auth solid; rate limits missing |
| Launch readiness | Moderate — legal/assets pending |

See [PROJECT_READINESS_REPORT.md](./PROJECT_READINESS_REPORT.md) for graded assessment.
