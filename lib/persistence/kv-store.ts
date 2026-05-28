import "server-only";

import { fileGet, fileSet, isFilePersistenceEnabled } from "@/lib/persistence/file-store";
import { isRedisConfigured, redisGet, redisSet } from "@/lib/persistence/redis-client";

export type PersistBackend = "redis" | "file" | "none";

export type PersistSetResult = {
  ok: boolean;
  backend: PersistBackend;
  error?: string;
};

export function isVercelDeployment(): boolean {
  return process.env.VERCEL === "1";
}

/** File storage is local-dev only — never on Vercel/serverless. */
export function shouldUseFilePersistence(): boolean {
  if (isVercelDeployment()) return false;
  if (!isFilePersistenceEnabled()) return false;
  return true;
}

export function isRemotePersistenceConfigured(): boolean {
  return isRedisConfigured();
}

export function isPersistenceAvailable(): boolean {
  return isRedisConfigured() || shouldUseFilePersistence();
}

/** Production requires Redis/KV — file fallback is not valid on Vercel. */
export function requireRedisForPersistence(): boolean {
  return isVercelDeployment() || process.env.REQUIRE_REDIS_PERSISTENCE === "true";
}

export async function persistGet<T>(key: string): Promise<T | null> {
  if (isRedisConfigured()) {
    const fromRedis = await redisGet<T>(key);
    if (fromRedis != null) return fromRedis;
  }

  if (!shouldUseFilePersistence()) return null;
  return fileGet<T>(key);
}

export async function persistSet<T>(
  key: string,
  value: T,
  options?: { exSeconds?: number }
): Promise<PersistSetResult> {
  if (isRedisConfigured()) {
    const redisOk = await redisSet(key, value, options);
    if (redisOk) {
      return { ok: true, backend: "redis" };
    }

    if (requireRedisForPersistence()) {
      return {
        ok: false,
        backend: "none",
        error:
          "Redis/KV write failed. Check UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (or KV_REST_*).",
      };
    }
  } else if (requireRedisForPersistence()) {
    return {
      ok: false,
      backend: "none",
      error:
        "Redis/KV is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for production persistence.",
    };
  }

  if (shouldUseFilePersistence()) {
    const fileOk = await fileSet(key, value);
    return fileOk
      ? { ok: true, backend: "file" }
      : {
          ok: false,
          backend: "none",
          error: "Local file persistence failed",
        };
  }

  return {
    ok: false,
    backend: "none",
    error: "No persistence backend available",
  };
}
