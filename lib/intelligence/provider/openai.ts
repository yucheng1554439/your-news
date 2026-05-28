import "server-only";

import { extractJsonPayload } from "@/lib/intelligence/provider/extract-json";
import { getOpenAIModel } from "@/lib/intelligence/provider/config";
import type {
  AICallMeta,
  AIUsage,
  CallAIJsonOptions,
  CallAIJsonResult,
} from "@/lib/intelligence/provider/types";

const OPENAI_API = "https://api.openai.com/v1/chat/completions";
const MAX_ATTEMPTS = 3;
const NO_RETRY_HTTP = new Set([400, 401, 403, 404, 429]);

type ChatCompletionResponse = {
  error?: { message?: string; code?: string };
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  choices?: { message?: { content?: string } }[];
};

function logOpenAI(
  level: "info" | "warn" | "error",
  message: string,
  extra?: Record<string, unknown>
): void {
  const payload = extra ? ` ${JSON.stringify(extra)}` : "";
  const line = `[OPENAI] ${message}${payload}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

function parseUsage(data: ChatCompletionResponse): AIUsage | undefined {
  const u = data.usage;
  if (!u?.total_tokens) return undefined;
  return {
    promptTokens: u.prompt_tokens ?? 0,
    completionTokens: u.completion_tokens ?? 0,
    totalTokens: u.total_tokens,
  };
}

function formatUsage(usage?: AIUsage): string {
  if (!usage) return "Tokens: (not reported)";
  return `Tokens: ${usage.totalTokens} (prompt ${usage.promptTokens}, completion ${usage.completionTokens})`;
}

function getResponseFormat(options: CallAIJsonOptions<unknown>): "json" | "tags" {
  return options.responseFormat ?? "json";
}

function buildSystemPrompt(system: string, format: "json" | "tags"): string {
  if (format === "tags") {
    return `${system}

Use the exact XML-style tags specified in the user message for each section.
Put each section's content only inside its matching open/close tags.`;
  }
  return `${system}\n\nRespond with valid JSON only. No markdown fences.`;
}

function contentForParser(raw: string, format: "json" | "tags"): string {
  return format === "tags" ? raw.trim() : extractJsonPayload(raw);
}

export async function callOpenAIJson<T>(
  options: CallAIJsonOptions<T>
): Promise<CallAIJsonResult<T>> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = getOpenAIModel();

  if (!apiKey) {
    logOpenAI("warn", `${options.label} skipped — OPENAI_API_KEY is not configured`);
    return { ok: false, error: "OPENAI_API_KEY is not configured" };
  }

  const format = getResponseFormat(options);
  logOpenAI("info", `${options.label} starting`, { model, format });

  let lastError = "OpenAI request failed";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const started = Date.now();
    try {
      const res = await fetch(OPENAI_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
          ...(format === "json"
            ? { response_format: { type: "json_object" } }
            : {}),
          messages: [
            { role: "system", content: buildSystemPrompt(options.system, format) },
            { role: "user", content: options.user },
          ],
        }),
      });

      const data = (await res.json()) as ChatCompletionResponse;
      const durationMs = Date.now() - started;
      const usage = parseUsage(data);

      if (!res.ok) {
        lastError = data.error?.message ?? `OpenAI HTTP ${res.status}`;
        logOpenAI("error", `${options.label} HTTP ${res.status}`, {
          model,
          attempt,
          durationMs,
          error: lastError,
          code: data.error?.code,
        });

        if (NO_RETRY_HTTP.has(res.status)) {
          return {
            ok: false,
            error: lastError,
            meta: {
              provider: "openai",
              label: options.label,
              model,
              durationMs,
              attempt,
            },
          };
        }
        await delay(attempt * 400);
        continue;
      }

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        lastError = "Empty OpenAI response";
        logOpenAI("warn", `${options.label} empty content`, { attempt, durationMs });
        await delay(attempt * 400);
        continue;
      }

      const parsed = options.parse(contentForParser(content, format));
      if (!parsed) {
        lastError =
          format === "tags"
            ? "Could not parse OpenAI tagged response"
            : "Could not parse OpenAI JSON";
        logOpenAI("warn", `${options.label} parse failed`, {
          attempt,
          durationMs,
          format,
          preview: content.slice(0, 200),
        });
        await delay(attempt * 400);
        continue;
      }

      const meta: AICallMeta = {
        provider: "openai",
        label: options.label,
        model,
        durationMs,
        usage,
        attempt,
      };

      logOpenAI(
        "info",
        `${options.label} succeeded — Model: ${model} — ${formatUsage(usage)} — Duration: ${(durationMs / 1000).toFixed(1)}s`
      );

      return { ok: true, data: parsed, meta };
    } catch (err) {
      const durationMs = Date.now() - started;
      lastError =
        err instanceof Error ? err.message : "OpenAI unreachable";
      logOpenAI("error", `${options.label} network error`, {
        attempt,
        durationMs,
        error: lastError,
      });
      await delay(attempt * 400);
    }
  }

  logOpenAI("error", `${options.label} failed after ${MAX_ATTEMPTS} attempts`, {
    model,
    error: lastError,
  });

  return { ok: false, error: lastError };
}

export async function pingOpenAI(): Promise<{
  configured: boolean;
  ok: boolean;
  model: string;
  error?: string;
  usage?: AIUsage;
  durationMs?: number;
}> {
  const model = getOpenAIModel();
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return { configured: false, ok: false, model, error: "OPENAI_API_KEY missing" };
  }

  const result = await callOpenAIJson({
    label: "Health check",
    system: "Reply with JSON only.",
    user: '{"ping":"ok"}',
    maxTokens: 16,
    temperature: 0,
    parse: (content) => {
      try {
        const p = JSON.parse(content) as { ping?: string };
        return p.ping === "ok" ? p : null;
      } catch {
        return null;
      }
    },
  });

  if (result.ok) {
    return {
      configured: true,
      ok: true,
      model,
      usage: result.meta.usage,
      durationMs: result.meta.durationMs,
    };
  }

  return {
    configured: true,
    ok: false,
    model,
    error: result.error,
    durationMs: result.meta?.durationMs,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
