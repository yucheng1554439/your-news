import "server-only";

import { Redis } from "@upstash/redis";

let client: Redis | null | undefined;
let resolvedSource: string | null = null;

export type RedisConfigDiagnostics = {
  configured: boolean;
  source: string | null;
  urlHost: string | null;
  missing: string[];
};

function firstDefined(...values: (string | undefined)[]): string | undefined {
  for (const v of values) {
    const t = v?.trim();
    if (t) return t;
  }
  return undefined;
}

/** Resolve Upstash REST credentials from Vercel KV / Upstash env aliases. */
export function resolveRedisCredentials(): { url: string; token: string; source: string } | null {
  const upstashPair =
    firstDefined(process.env.UPSTASH_REDIS_REST_URL) &&
    firstDefined(process.env.UPSTASH_REDIS_REST_TOKEN)
      ? {
          url: firstDefined(process.env.UPSTASH_REDIS_REST_URL)!,
          token: firstDefined(process.env.UPSTASH_REDIS_REST_TOKEN)!,
          source: "UPSTASH_REDIS_REST_*",
        }
      : null;

  if (upstashPair) return upstashPair;

  const kvPair =
    firstDefined(process.env.KV_REST_API_URL) &&
    firstDefined(process.env.KV_REST_API_TOKEN)
      ? {
          url: firstDefined(process.env.KV_REST_API_URL)!,
          token: firstDefined(process.env.KV_REST_API_TOKEN)!,
          source: "KV_REST_API_*",
        }
      : null;

  if (kvPair) return kvPair;

  const kvUrlPair =
    firstDefined(process.env.KV_URL) && firstDefined(process.env.KV_REST_API_TOKEN)
      ? {
          url: firstDefined(process.env.KV_URL)!,
          token: firstDefined(process.env.KV_REST_API_TOKEN)!,
          source: "KV_URL + KV_REST_API_TOKEN",
        }
      : null;

  if (kvUrlPair) return kvUrlPair;

  return null;
}

export function getRedisConfigDiagnostics(): RedisConfigDiagnostics {
  const creds = resolveRedisCredentials();
  const missing: string[] = [];

  if (!firstDefined(process.env.UPSTASH_REDIS_REST_URL)) {
    missing.push("UPSTASH_REDIS_REST_URL");
  }
  if (!firstDefined(process.env.UPSTASH_REDIS_REST_TOKEN)) {
    missing.push("UPSTASH_REDIS_REST_TOKEN");
  }
  if (!firstDefined(process.env.KV_REST_API_URL)) {
    missing.push("KV_REST_API_URL");
  }
  if (!firstDefined(process.env.KV_REST_API_TOKEN)) {
    missing.push("KV_REST_API_TOKEN");
  }

  let urlHost: string | null = null;
  if (creds?.url) {
    try {
      urlHost = new URL(creds.url).host;
    } catch {
      urlHost = creds.url.slice(0, 40);
    }
  }

  return {
    configured: Boolean(creds),
    source: creds?.source ?? null,
    urlHost,
    missing,
  };
}

export function getRedisClient(): Redis | null {
  if (client !== undefined) return client;

  const creds = resolveRedisCredentials();
  if (!creds) {
    client = null;
    resolvedSource = null;
    return null;
  }

  client = new Redis({ url: creds.url, token: creds.token });
  resolvedSource = creds.source;
  return client;
}

export function getRedisConfigSource(): string | null {
  if (client === undefined) getRedisClient();
  return resolvedSource;
}

export function isRedisConfigured(): boolean {
  return getRedisClient() !== null;
}

export async function redisGet<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    const value = await redis.get<T>(key);
    return value ?? null;
  } catch (err) {
    console.error(`[PERSIST] Redis GET failed for ${key}:`, err);
    return null;
  }
}

export async function redisSet<T>(
  key: string,
  value: T,
  options?: { exSeconds?: number }
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;
  try {
    if (options?.exSeconds) {
      await redis.set(key, value, { ex: options.exSeconds });
    } else {
      await redis.set(key, value);
    }
    return true;
  } catch (err) {
    console.error(`[PERSIST] Redis SET failed for ${key}:`, err);
    return false;
  }
}

export async function redisDel(key: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (err) {
    console.error(`[PERSIST] Redis DEL failed for ${key}:`, err);
  }
}

/** Verify read/write against the configured store. */
export async function pingRedis(): Promise<{
  ok: boolean;
  source: string | null;
  error?: string;
  latencyMs?: number;
}> {
  const creds = resolveRedisCredentials();
  if (!creds) {
    return {
      ok: false,
      source: null,
      error: "Redis/KV credentials not found in environment",
    };
  }

  const redis = getRedisClient();
  if (!redis) {
    return { ok: false, source: null, error: "Redis client failed to initialize" };
  }

  const probeKey = "yn:v2:ping";
  const started = Date.now();
  try {
    await redis.set(probeKey, { t: Date.now() }, { ex: 60 });
    const read = await redis.get<{ t: number }>(probeKey);
    if (!read?.t) {
      return {
        ok: false,
        source: creds.source,
        error: "Redis write succeeded but read-back failed",
      };
    }
    return {
      ok: true,
      source: creds.source,
      latencyMs: Date.now() - started,
    };
  } catch (err) {
    return {
      ok: false,
      source: creds.source,
      error: err instanceof Error ? err.message : "Redis ping failed",
    };
  }
}
