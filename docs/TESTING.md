# Testing Guide

Your News uses **Vitest** for unit tests and optional integration smoke tests against a running dev server.

---

## Quick start

```bash
npm install
npm test                 # Run all unit tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report (v8)
```

Integration (requires running server):

```bash
npm run dev   # terminal 1
$env:API_TEST_BASE_URL="http://localhost:3000"; npm run test:integration   # PowerShell
# API_TEST_BASE_URL=http://localhost:3000 npm run test:integration       # bash
```

---

## Test layout

```
tests/
├── unit/                           # Fast, no network
│   ├── coverage-period.test.ts     # Briefing date logic
│   ├── for-you-quality.test.ts     # For You quality gates
│   └── story-intelligence-quality.test.ts
└── integration/
    └── api-health.test.ts          # GET /api/v1/health smoke
```

Config: `vitest.config.ts` (path alias `@/` → project root).

---

## What to test

### Critical paths (priority)

| Path | Suggested test type |
|------|---------------------|
| User isolation KV keys | `npm run verify:isolation` (script) |
| For You quality gates | Unit — `for-you-quality.test.ts` |
| Coverage period labels | Unit — `coverage-period.test.ts` |
| Story intel artifact stripping | Unit — `story-intelligence-quality.test.ts` |
| API auth (401 without token) | Integration |
| Dashboard serialization shape | Unit with fixtures |
| Refresh intelligence result | Integration / mocked AI |

### Intelligence pipeline

Prefer **pure function unit tests** over full AI integration:

- Mock Claude responses in `refreshPlatformIntelligence` tests (future)
- Test repair functions with fixture briefings
- Test `serializeDashboardResponse` with stub `PlatformDashboard`

Example pattern:

```typescript
import { describe, it, expect } from "vitest";
import { repairForYouSections } from "@/lib/briefing/repair-for-you-sections";

describe("repairForYouSections", () => {
  it("replaces generic watch text", () => {
    // fixture briefing with template watch → expect corpus-specific output
  });
});
```

---

## Coverage expectations

| Area | Target | Current |
|------|--------|---------|
| `lib/briefing/shared/*` | 80%+ | Partial |
| `lib/intelligence/story-intelligence-quality.ts` | 80%+ | Partial |
| `lib/persistence/keys.ts` | 100% | Not covered |
| API routes | Integration smoke | Health only |
| UI components | Optional | None |

Run `npm run test:coverage` and open `coverage/index.html`.

**CI minimum:** all unit tests pass; build succeeds.

---

## Multi-user isolation

Not Vitest — dedicated script:

```bash
npm run verify:isolation
```

Requires Redis or file persistence configured. Runs in CI on push with `continue-on-error` until Redis secrets are available in GitHub Actions.

---

## CI

`.github/workflows/ci.yml`:

1. `npm ci`
2. `npm run lint`
3. `npx tsc --noEmit`
4. `npm test`
5. `npm run build`

---

## Future testing roadmap

| Tool | Purpose |
|------|---------|
| Playwright | Web e2e — sign-in, dashboard, story detail |
| MSW | Mock NewsAPI + Anthropic in integration tests |
| Detox / Maestro | Mobile smoke flows |
| Contract tests | OpenAPI schema validation for API v1 |

---

## Writing new tests

1. Place pure logic tests in `tests/unit/`
2. Use `@/` imports
3. Avoid hitting real NewsAPI or Anthropic in CI
4. Name files `*.test.ts`
5. Update this doc when adding new critical paths

---

## Related

- [CONTRIBUTING.md](../CONTRIBUTING.md)
- [REPOSITORY_AUDIT.md](./REPOSITORY_AUDIT.md)
