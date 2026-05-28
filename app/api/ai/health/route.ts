import { NextResponse } from "next/server";
import {
  getAIProvider,
  getActiveModel,
  isAIConfigured,
  pingAI,
} from "@/lib/intelligence/provider";

export const dynamic = "force-dynamic";

/** GET /api/ai/health — pings the configured AI_PROVIDER. */
export async function GET() {
  const provider = getAIProvider();
  const model = getActiveModel();

  if (!isAIConfigured()) {
    return NextResponse.json({
      provider,
      configured: false,
      ok: false,
      model,
      error:
        provider === "anthropic"
          ? "ANTHROPIC_API_KEY missing"
          : "OPENAI_API_KEY missing",
    });
  }

  const result = await pingAI();

  return NextResponse.json({
    ...result,
    hint: result.ok
      ? `${provider} is reachable; check provider dashboard for usage.`
      : `Fix the error above. Server logs include [${provider.toUpperCase()}] lines.`,
  });
}
