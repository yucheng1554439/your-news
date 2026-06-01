import { NextResponse } from "next/server";
import {
  getLatestAIResponse,
  getLatestFailedAIResponse,
  getRecentAIResponses,
} from "@/lib/intelligence/latest-ai-response";
import { getAIProvider } from "@/lib/intelligence/provider";

export const dynamic = "force-dynamic";

function debugEnabled(): boolean {
  if (process.env.DEBUG_INTELLIGENCE === "true") return true;
  return process.env.NODE_ENV !== "production";
}

/**
 * GET /api/debug/latest-claude-response
 * Inspect the most recent AI briefing response (especially failed parses).
 * Enabled when NODE_ENV !== production or DEBUG_INTELLIGENCE=true.
 */
export async function GET(request: Request) {
  if (!debugEnabled()) {
    return NextResponse.json(
      { error: "Debug endpoint disabled. Set DEBUG_INTELLIGENCE=true." },
      { status: 404 }
    );
  }

  const url = new URL(request.url);
  const failedOnly = url.searchParams.get("failed") === "1";
  const includeRecent = url.searchParams.get("recent") === "1";

  const entry = failedOnly
    ? getLatestFailedAIResponse()
    : getLatestAIResponse();

  if (!entry) {
    return NextResponse.json({
      provider: getAIProvider(),
      message: "No AI responses recorded yet. Run Refresh Intelligence first.",
    });
  }

  return NextResponse.json({
    provider: getAIProvider(),
    latest: {
      at: new Date(entry.at).toISOString(),
      label: entry.label,
      provider: entry.provider,
      format: entry.format,
      ok: entry.ok,
      error: entry.error,
      rawLength: entry.rawLength,
      foundTags: entry.foundTags,
      missingTags: entry.missingTags,
      parseStatus: entry.parseStatus,
      raw: entry.raw,
    },
    recent: includeRecent
      ? getRecentAIResponses(5).map((e) => ({
          at: new Date(e.at).toISOString(),
          label: e.label,
          ok: e.ok,
          error: e.error,
          rawLength: e.rawLength,
        }))
      : undefined,
    hint: "Add ?failed=1 for last failed parse only. Add ?recent=1 for last 5 entries.",
  });
}
