export type IntelligenceRefreshPayload = {
  ok: boolean;
  refreshedAt: number;
  storiesProcessed: number;
  storiesAdded: number;
  briefingUpdated: boolean;
  signalsUpdated: boolean;
  error?: string;
};
