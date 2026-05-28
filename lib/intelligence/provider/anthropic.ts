import "server-only";

import { extractJsonPayload } from "@/lib/intelligence/provider/extract-json";
import { getAnthropicModel } from "@/lib/intelligence/provider/config";
import type {
  AICallMeta,
  AIUsage,
  CallAIJsonOptions,
  CallAIJsonResult,
} from "@/lib/intelligence/provider/types";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_ATTEMPTS = 3;
const NO_RETRY_HTTP = new Set([400, 401, 403, 404, 413, 429, 529]);

type AnthropicResponse = {
  error?: { type?: string; message?: string };
  content?: { type?: string; text?: string }[];
  usage?: { input_tokens?: number; output_tokens?: number };
};

function logAnthropic(
  level: "info" | "warn" | "error",
  message: string,
  extra?: Record<string, unknown>
): void {
  const payload = extra ? ` ${JSON.stringify(extra)}` : "";
  const line = `[ANTHROPIC] ${message}${payload}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

function parseUsage(data: AnthropicResponse): AIUsage | undefined {
  const u = data.usage;
  if (!u?.input_tokens && !u?.output_tokens) return undefined;
  const promptTokens = u.input_tokens ?? 0;
  const completionTokens = u.output_tokens ?? 0;
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

function formatUsage(usage?: AIUsage): string {
  if (!usage) return "Tokens: (not reported)";
  return `Tokens: ${usage.totalTokens} (input ${usage.promptTokens}, output ${usage.completionTokens})`;
}

function responseFormat(options: CallAIJsonOptions<unknown>): "json" | "tags" {
  return options.responseFormat ?? "json";
}

function buildSystemPrompt(system: string, format: "json" | "tags"): string {
  if (format === "tags") {
    return `${system}

Use the exact XML-style tags specified in the user message for each section.
Put each section's content only inside its matching open/close tags.
You may add brief notes outside tags, but every required section must appear in tags.`;
  }
  return `${system}\n\nRespond with valid JSON only. No markdown fences.`;
}

function contentForParser(raw: string, format: "json" | "tags"): string {
  return format === "tags" ? raw.trim() : extractJsonPayload(raw);
}

export async function callAnthropicJson<T>(
  options: CallAIJsonOptions<T>
): Promise<CallAIJsonResult<T>> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  const model = getAnthropicModel();

  if (!apiKey) {
    logAnthropic(
      "warn",
      `${options.label} skipped — ANTHROPIC_API_KEY is not configured`
    );
    return { ok: false, error: "ANTHROPIC_API_KEY is not configured" };
  }

  const format = responseFormat(options);
  logAnthropic("info", `${options.label} starting`, { model, format });

  let lastError = "Anthropic request failed";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const started = Date.now();
    try {
      const res = await fetch(ANTHROPIC_API, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: options.maxTokens,
          temperature: options.temperature,
          system: buildSystemPrompt(options.system, format),
          messages: [{ role: "user", content: options.user }],
        }),
      });

      const data = (await res.json()) as AnthropicResponse;
      const durationMs = Date.now() - started;
      const usage = parseUsage(data);

      if (!res.ok) {
        lastError = data.error?.message ?? `Anthropic HTTP ${res.status}`;
        logAnthropic("error", `${options.label} HTTP ${res.status}`, {
          model,
          attempt,
          durationMs,
          error: lastError,
          type: data.error?.type,
        });

        if (NO_RETRY_HTTP.has(res.status)) {
          return {
            ok: false,
            error: lastError,
            meta: {
              provider: "anthropic",
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

      const block = data.content?.find((c) => c.type === "text");
      const raw = block?.text?.trim();
      if (!raw) {
        lastError = "Empty Anthropic response";
        logAnthropic("warn", `${options.label} empty content`, {
          attempt,
          durationMs,
        });
        await delay(attempt * 400);
        continue;
      }

      const parsed = options.parse(contentForParser(raw, format));
      if (!parsed) {
        lastError =
          format === "tags"
            ? "Could not parse Anthropic tagged response"
            : "Could not parse Anthropic JSON";
        logAnthropic("warn", `${options.label} parse failed`, {
          attempt,
          durationMs,
          format,
          preview: raw.slice(0, 200),
        });
        await delay(attempt * 400);
        continue;
      }

      const meta: AICallMeta = {
        provider: "anthropic",
        label: options.label,
        model,
        durationMs,
        usage,
        attempt,
      };

      logAnthropic(
        "info",
        `${options.label} succeeded — Model: ${model} — ${formatUsage(usage)} — Duration: ${(durationMs / 1000).toFixed(1)}s`
      );

      return { ok: true, data: parsed, meta };
    } catch (err) {
      const durationMs = Date.now() - started;
      lastError =
        err instanceof Error ? err.message : "Anthropic unreachable";
      logAnthropic("error", `${options.label} network error`, {
        attempt,
        durationMs,
        error: lastError,
      });
      await delay(attempt * 400);
    }
  }

  logAnthropic("error", `${options.label} failed after ${MAX_ATTEMPTS} attempts`, {
    model,
    error: lastError,
  });

  return { ok: false, error: lastError };
}

export async function pingAnthropic(): Promise<{
  configured: boolean;
  ok: boolean;
  model: string;
  error?: string;
  usage?: AIUsage;
  durationMs?: number;
}> {
  const model = getAnthropicModel();
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return {
      configured: false,
      ok: false,
      model,
      error: "ANTHROPIC_API_KEY missing",
    };
  }

  const result = await callAnthropicJson({
    label: "Health check",
    system: "Reply with JSON only.",
    user: 'Return exactly: {"ping":"ok"}',
    maxTokens: 32,
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
