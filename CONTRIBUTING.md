# Contributing to Your News

Thank you for helping make Your News production-ready. This guide covers local setup, conventions, and the review process.

## Prerequisites

- Node.js 20+
- npm 10+
- Clerk account (auth)
- Upstash Redis or Vercel KV (persistence — required for intelligence features)
- NewsAPI key (story ingest)
- Anthropic API key (intelligence generation)

For mobile work, also install [Expo CLI](https://docs.expo.dev/) and Xcode or Android Studio.

## Getting started

```bash
git clone https://github.com/your-org/your-news.git
cd your-news
cp .env.example .env.local
npm install
npm run dev
```

Mobile:

```bash
cd mobile
cp .env.example .env
npm install
npx expo start
```

See [README.md](./README.md) and [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for full environment setup.

## Development workflow

1. Create a branch from `main`: `feat/short-description` or `fix/short-description`
2. Make focused changes — prefer small, reviewable PRs
3. Run checks locally:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

4. For intelligence or isolation changes:

```bash
npm run verify:isolation
```

5. Open a pull request using the PR template

## Code conventions

- **TypeScript** everywhere; strict types for API payloads and intelligence models
- **Server-only** intelligence and persistence code stays in `lib/` with `import "server-only"` where applicable
- **User isolation** — never read or write global KV keys for per-user data; use `userIntelligenceSnapshotKey(userId)` and related helpers in `lib/persistence/keys.ts`
- **API v1** — mobile-facing routes live under `app/api/v1/`; authenticate via `requireApiUser`
- **Briefing quality** — avoid generic For You copy; use corpus-driven narratives in `lib/briefing/shared/`
- Match existing naming, import style, and component patterns before introducing new abstractions

## Documentation

Update docs when you change:

- API request/response shapes → `docs/API.md`
- Environment variables → `.env.example`
- Deployment steps → `docs/DEPLOYMENT.md`
- Intelligence behavior → `docs/INTELLIGENCE_ENGINE.md`

## Reporting issues

Use GitHub issue templates for bugs and feature requests. For security issues, see [docs/SECURITY.md](./docs/SECURITY.md).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
