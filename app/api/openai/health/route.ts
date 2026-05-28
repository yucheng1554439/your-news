import { NextResponse } from "next/server";
import { getOpenAIModel, isOpenAIConfigured } from "@/lib/intelligence/provider/config";
import { pingOpenAI } from "@/lib/intelligence/provider/openai";

export const dynamic = "force-dynamic";

/** GET /api/openai/health — verifies OpenAI Chat Completions (when used as provider). */
export async function GET() {
  const configured = isOpenAIConfigured();
  const model = getOpenAIModel();

  if (!configured) {
    return NextResponse.json({
      provider: "openai",
      configured: false,
      ok: false,
      model,
      error: "OPENAI_API_KEY is not set in server environment",
    });
  }

  const result = await pingOpenAI();

  return NextResponse.json({
    provider: "openai",
    ...result,
    hint: result.ok
      ? "OpenAI is reachable; check dashboard for token usage."
      : "Fix the error above. Server logs include [OPENAI] lines.",
  });
}
