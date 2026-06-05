import { API_VERSION, apiError, apiJson, apiOptions } from "@/lib/api/response";
import { isRemotePersistenceConfigured } from "@/lib/persistence/kv-store";
import { isRedisConfigured } from "@/lib/persistence/redis-client";

export const dynamic = "force-dynamic";

export async function GET() {
  return apiJson({
    ok: true,
    version: API_VERSION,
    service: "your-news",
    timestamp: Date.now(),
    persistence: {
      redisConfigured: isRedisConfigured(),
      remoteConfigured: isRemotePersistenceConfigured(),
    },
  });
}

export async function OPTIONS() {
  return apiOptions();
}
