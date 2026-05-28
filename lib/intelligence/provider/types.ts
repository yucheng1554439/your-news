export type AIProviderId = "anthropic" | "openai";

export type AIUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type AICallMeta = {
  provider: AIProviderId;
  label: string;
  model: string;
  durationMs: number;
  usage?: AIUsage;
  attempt: number;
};

export type AIResponseFormat = "json" | "tags";

export type CallAIJsonOptions<T> = {
  label: string;
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
  /** `tags` — tolerant section extraction; `json` — legacy JSON-only (health checks). */
  responseFormat?: AIResponseFormat;
  parse: (content: string) => T | null;
};

export type CallAIJsonResult<T> =
  | { ok: true; data: T; meta: AICallMeta }
  | { ok: false; error: string; meta?: Partial<AICallMeta> };

export type AIHealthResult = {
  provider: AIProviderId;
  configured: boolean;
  ok: boolean;
  model: string;
  error?: string;
  usage?: AIUsage;
  durationMs?: number;
};
