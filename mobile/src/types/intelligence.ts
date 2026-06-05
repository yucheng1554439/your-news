export type ProfileIntelligencePayload = {
  ok: true;
  effectiveLens: string;
  identity: {
    career: string | null;
    interests: string[];
    focus: string | null;
    tone: string | null;
  };
  primaryThemes: string[];
  emergingThemes: string[];
  behavior: {
    storiesOpened: number;
    storiesSaved: number;
    deepReads: number;
    behaviorConfidenceLabel: string;
    summary: string;
  };
  preferences: {
    moreOf: string[];
    lessOf: string[];
    neverShow: string[];
  };
  savedInfluence: {
    themes: string[];
    summary: string;
  };
};

export type SignalApiItem = {
  id: string;
  label: string;
  direction: "rising" | "falling";
  sourceCount: number;
  storyCount: number;
  explanation: string;
  whyItMatters: string;
  relevance: {
    tier: "high" | "medium" | "low";
    stars: number;
    label: string;
  };
  relatedStories: {
    slug: string;
    headline: string;
    source: string;
    publishedAt: string;
  }[];
};

export type SignalsPayload = {
  ok: true;
  lensLabel: string;
  generatedAt: number;
  rising: SignalApiItem[];
  falling: SignalApiItem[];
};
