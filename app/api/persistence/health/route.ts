import { NextResponse } from "next/server";
import { getPersistenceStatus } from "@/lib/intelligence/platform-snapshot";
import { getRedisConfigDiagnostics } from "@/lib/persistence/redis-client";

export const dynamic = "force-dynamic";

export async function GET() {
  const diagnostics = getRedisConfigDiagnostics();
  const status = await getPersistenceStatus();

  return NextResponse.json({
    ...status,
    urlHost: diagnostics.urlHost,
    hint: status.configured
      ? "Redis/KV is configured. Intelligence snapshots persist across deploys."
      : "Add UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (Upstash) or connect Vercel KV (KV_REST_API_URL + KV_REST_API_TOKEN).",
  });
}
