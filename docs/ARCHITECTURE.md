# Architecture

Your News is a full-stack personalized intelligence platform: web and mobile clients authenticate via Clerk, call a shared Next.js API layer, and receive dashboard payloads assembled from a Redis-backed intelligence engine.

---

## System overview

```mermaid
flowchart TB
  User((User))

  subgraph clients [Presentation]
    Web[Web App<br/>Next.js App Router]
    Mobile[Mobile App<br/>Expo + React Native]
  end

  subgraph edge [Edge / API]
    MW[Clerk Middleware]
    API["API v1<br/>/api/v1/*"]
  end

  subgraph core [Application Core]
    Dashboard[Platform Snapshot]
    Services[User Services]
    Briefing[Briefing Engine]
    Signals[Signals Engine]
    Personalize[Personalization / UIP]
    Ingest[News Ingest]
  end

  subgraph external [External]
    NewsAPI[NewsAPI]
    Claude[Anthropic Claude]
    OpenAI[OpenAI optional]
  end

  subgraph store [Persistence]
    KV[(Redis / Vercel KV)]
  end

  User --> Web
  User --> Mobile
  Web --> MW
  Mobile --> API
  MW --> Web
  Web --> API
  API --> Services
  API --> Dashboard
  Dashboard --> Briefing
  Dashboard --> Signals
  Dashboard --> Personalize
  Dashboard --> Ingest
  Ingest --> NewsAPI
  Briefing --> Claude
  Briefing --> OpenAI
  Services --> KV
  Dashboard --> KV
  Ingest --> KV
```

---

## Components

### Dashboard (`lib/intelligence/platform-snapshot.ts`)

Central orchestrator. Loads or refreshes:

- Story pool (global ingest cache)
- Global intelligence snapshot (briefings + metadata)
- Per-user intelligence snapshot (For You briefing, UIP overlay)
- Applies read-time repairs (For You section quality, coverage dates)

Exposed via `GET /api/v1/dashboard` and used by web SSR paths.

### Briefings (`lib/briefing/`)

| Cadence | Description |
|---------|-------------|
| **Global** | Daily editorial briefing across top corpus stories |
| **For You** | Personalized sections from UIP + topic preferences + saved behavior |

Engines: `weekly-engine.ts`, `for-you-sections.ts`, corpus narratives, quality validation.

### Signals (`lib/signals/`)

Narrative clusters with **momentum scoring** and human-readable explanations. Consumed on dashboard and `GET /api/v1/signals`.

### Story Intelligence (`lib/intelligence/`)

Per-story AI package: briefing memo, why it matters, watch, action. Quality gates in `story-intelligence-quality.ts` prevent raw article leakage.

### UIP — User Intelligence Profile (`lib/personalization/`)

Derived from onboarding, topic preferences, saved stories, and implicit behavior. Drives For You sections and relevance scoring.

### Saved Stories (`lib/services/saved-stories.ts`)

User-scoped list stored under profile keys in KV. Synced via `GET/POST /api/v1/profile/saved`.

### Topic Preferences (`lib/services/topic-preferences.ts`)

Explicit topic boosts/suppressions. `GET/PUT /api/v1/profile/topics`.

---

## Data flow

### Story ingestion

```mermaid
sequenceDiagram
  participant Refresh as Refresh Pipeline
  participant News as NewsAPI
  participant Pool as Story Pool KV
  participant Snap as Intelligence Snapshot

  Refresh->>News: Fetch headlines + metadata
  News-->>Refresh: Raw articles
  Refresh->>Refresh: Normalize, dedupe, score importance
  Refresh->>Pool: yn:v1:story-pool
  Refresh->>Snap: Update global snapshot metadata
```

1. Triggered by `POST /api/v1/intelligence/refresh` or web settings action.
2. `lib/news.ts` fetches from NewsAPI with TTL cache.
3. Normalized `Story` objects persisted to `yn:v1:story-pool`.

### Intelligence generation

```mermaid
flowchart LR
  Corpus[Story Corpus] --> Cluster[Narrative Clustering]
  Cluster --> Global[Global Briefing]
  Cluster --> Signals[Signals]
  Corpus --> StoryIntel[Per-Story Intelligence]
  UIP[User Profile] --> ForYou[For You Briefing]
  Cluster --> ForYou
```

- **Global briefing** — AI synthesis over ranked corpus (`lib/briefing/weekly-engine.ts`).
- **For You** — Sections built from clusters weighted by UIP (`lib/briefing/for-you-sections.ts`).
- **Story intelligence** — Generated per slug + profile hash, cached in KV.

### Feed ranking

```mermaid
flowchart TD
  Stories[Story Pool] --> Gate[Relevance Gate]
  UIP[UIP] --> Gate
  Topics[Topic Preferences] --> Gate
  Gate --> Lead[Featured / Lead]
  Gate --> Relevant[Relevant Strip]
  Gate --> Top[Top Stories]
  Gate --> More[More Stories Feed]
```

Implemented in `lib/personalization/relevance-gate.ts`, `lib/feed/more-stories.ts`, serialized in `serialize-dashboard.ts`.

### Personalization

| Input | Effect |
|-------|--------|
| Onboarding interests / career | Base UIP facets |
| Topic preferences | Boost/suppress categories and tags |
| Saved stories | Implicit interest signals |
| Refresh Intelligence | Recomputes UIP + For You briefing |

### Refresh Intelligence

```mermaid
sequenceDiagram
  participant Client as Web / Mobile
  participant API as POST /intelligence/refresh
  participant Platform as platform-snapshot
  participant AI as Claude
  participant KV as Redis

  Client->>API: Authenticated POST
  API->>Platform: refreshPlatformIntelligence(userId)
  Platform->>Platform: Ingest fresh stories
  Platform->>AI: Regenerate briefings + story intel
  Platform->>KV: Global + user snapshots
  Platform-->>API: RefreshIntelligenceResult
  API-->>Client: ok, counts, timestamps
```

Max duration: 300s (Vercel Pro required for long-running refresh).

---

## Web vs mobile

| Concern | Web | Mobile |
|---------|-----|--------|
| Auth | Clerk session cookies | Clerk + Bearer JWT |
| Data | SSR + server actions + API | API v1 hooks |
| Navigation | App Router pages | Expo Router tabs + stacks |
| Briefings | React server components | `BriefingView` + pager |

---

## Key directories

| Path | Role |
|------|------|
| `app/api/v1/` | Mobile-facing REST API |
| `app/story/[slug]/` | Web story detail (SSR) |
| `lib/intelligence/platform-snapshot.ts` | Dashboard + refresh |
| `lib/persistence/keys.ts` | KV key schema |
| `lib/api/auth.ts` | Session + Bearer auth |
| `mobile/src/api/` | HTTP client |
| `mobile/src/hooks/` | Data fetching hooks |

---

## Related documents

- [API.md](./API.md) — Endpoint reference
- [INTELLIGENCE_ENGINE.md](./INTELLIGENCE_ENGINE.md) — Deep dive
- [MULTI_TENANCY.md](./MULTI_TENANCY.md) — User isolation
- [MOBILE_ARCHITECTURE.md](./MOBILE_ARCHITECTURE.md) — Expo structure
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Production setup
