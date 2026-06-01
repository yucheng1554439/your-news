import { NextResponse } from "next/server";
import { getEnrichedStoryFromSnapshot } from "@/lib/intelligence/platform-snapshot";
import { getStoryBySlug } from "@/lib/data/stories";
import { verifyIntelligenceMatch } from "@/lib/intelligence/provenance-match";

export const dynamic = "force-dynamic";

function debugEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.DEBUG_RANKING === "1"
  );
}

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  if (!debugEnabled()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { slug } = await params;
  const base = await getStoryBySlug(slug, { enrich: false });
  if (!base) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  const snapshot = await getEnrichedStoryFromSnapshot(slug);
  const match = snapshot
    ? verifyIntelligenceMatch(base, snapshot)
    : {
        match: true,
        storySlug: base.slug,
        storyHeadline: base.headline,
        headlineTokenOverlap: 0,
        reasons: ["no snapshot intelligence"],
      };

  return NextResponse.json({
    storyId: base.slug,
    storySlug: base.slug,
    storyHeadline: base.headline,
    intelligence: snapshot
      ? {
          intelligenceAnchorSlug: snapshot.intelligenceAnchorSlug,
          intelligenceAnchorHeadline: snapshot.intelligenceAnchorHeadline,
          intelligenceMaterialSlugs: snapshot.intelligenceMaterialSlugs,
          intelligenceClusterId: snapshot.intelligenceClusterId,
          intelligenceGeneratedBy: snapshot.intelligenceGeneratedBy,
          summaryPreview: snapshot.summary?.slice(0, 200),
          whyItMattersPreview: snapshot.whyItMatters?.slice(0, 200),
        }
      : null,
    match,
  });
}
