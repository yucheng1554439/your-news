# Your News

Personalized AI intelligence briefing platform — premium editorial UI with mock data and client-side personalization.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Framer Motion

## Getting Started

1. Copy `.env.example` to `.env.local` and add keys from [Clerk Dashboard](https://dashboard.clerk.com).
2. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Unauthenticated users are sent to sign-in. New users sign up → onboarding → personalized dashboard.

### Auth flow

- **Sign up** → `/onboarding/interests` → career → preferences → dashboard
- **Sign in** → dashboard (or onboarding if incomplete)
- Preferences sync to **Clerk `publicMetadata`** and local cache per user

## Project Structure

| Path | Purpose |
|------|---------|
| `app/page.tsx` | Dashboard homepage |
| `app/story/[slug]/page.tsx` | Story detail |
| `app/onboarding/*` | 3-step onboarding flow |
| `app/settings/page.tsx` | Settings & personalization |
| `lib/news.ts` | Server-side NewsAPI fetch + normalization |
| `lib/ai.ts` | OpenAI intelligence briefing generation |
| `lib/summaries.ts` | Summary cache + story enrichment |
| `lib/importance-scoring.ts` | Editorial importance scores (1–10) + labels |
| `lib/data/stories.ts` | Cached live story accessors |
| `lib/onboarding.ts` | Client persistence + Clerk sync |
| `app/sign-in`, `app/sign-up` | Clerk auth pages |
| `middleware.ts` | Clerk auth + protected routes |
| `lib/personalization.ts` | Relevance scoring |

## Deploy

Deploy to [Vercel](https://vercel.com) with the default Next.js preset.
