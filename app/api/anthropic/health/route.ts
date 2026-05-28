import { NextResponse } from "next/server";
import {
  getAIProvider,
  getAnthropicModel,
  isAnthropicConfigured,
  pingAnthropicHealth,
} from "@/lib/intelligence/provider";

export const dynamic = "force-dynamic";

/** GET /api/anthropic/health — verifies Anthropic Messages API (dev/ops). */
export async function GET() {
  const configured = isAnthropicConfigured();
  const model = getAnthropicModel();
  const activeProvider = getAIProvider();

  if (!configured) {
    return NextResponse.json({
      provider: "anthropic",
      activeProvider,
      configured: false,
      ok: false,
      model,
      error: "ANTHROPIC_API_KEY is not set in server environment",
    });
  }

  const result = await pingAnthropicHealth();

  return NextResponse.json({
    ...result,
    activeProvider,
    hint: result.ok
      ? "Anthropic is reachable; check dashboard for token usage."
      : "Fix the error above. Server logs include [ANTHROPIC] lines.",
  });
}
