# Personalization Pipeline

How user-specific signals flow from profile data to ranked content.

```mermaid
flowchart TB
  subgraph inputs [User Inputs]
    OB[Onboarding Profile]
    TP[Topic Preferences]
    SS[Saved Stories]
    BH[Behavior Events]
  end

  subgraph uip [UIP Construction]
    OB --> Merge[Profile Merger]
    TP --> Merge
    SS --> Merge
    BH --> Merge
    Merge --> UIP[User Intelligence Profile]
  end

  subgraph corpus [Shared Corpus]
    Pool[Story Pool]
    Pool --> Clusters[Narrative Clusters]
  end

  subgraph outputs [Personalized Outputs]
    UIP --> FY[For You Briefing]
    Clusters --> FY
    UIP --> Rel[Relevance Scores]
    Pool --> Rel
    Rel --> Feed[Dashboard Feed Sections]
    UIP --> Sig[Signal Relevance Overlay]
    Clusters --> Sig
  end
```

## Story lifecycle

```mermaid
stateDiagram-v2
  [*] --> Ingested: NewsAPI fetch
  Ingested --> Pooled: Normalize + dedupe
  Pooled --> Clustered: Narrative grouping
  Clustered --> GlobalBrief: Global briefing AI
  Clustered --> ForYouBrief: For You sections
  Pooled --> StoryIntel: Per-slug intelligence
  Pooled --> Ranked: Feed relevance gate
  Ranked --> Displayed: Web / Mobile UI
  Displayed --> Saved: User saves story
  Saved --> UIP: Feeds back into profile
```

See [INTELLIGENCE_ENGINE.md](./INTELLIGENCE_ENGINE.md) and [ARCHITECTURE.md](./ARCHITECTURE.md) for implementation detail.
