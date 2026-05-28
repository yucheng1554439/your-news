import "server-only";

import { getCategoryLabel } from "@/lib/data/categories";
import {
  buildReaderContext,
  hasPersonalizationProfile,
} from "@/lib/intelligence/profile-context";
import type { StoryIntelligencePackage } from "@/lib/intelligence/types";
import type { OnboardingProfile, Story } from "@/lib/types";

const OPENAI_API = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function buildUnifiedPrompt(story: Story, profile: OnboardingProfile | null): string {
  const category = getCategoryLabel(story.category);
  const readerBlock = profile && hasPersonalizationProfile(profile)
    ? buildReaderContext(profile)
    : "";

  return `You are the chief intelligence editor of "Your News." Generate DISTINCT sections — each field must use different vocabulary and angles. Never repeat sentences across fields.

STORY INPUT:
- Headline: ${story.headline}
- Source: ${story.source}
- Category: ${category}
- Published: ${story.publishedAt}
- Raw excerpt: ${story.summary.slice(0, 500)}

${readerBlock}

SECTION RULES (critical):
1. "theBriefing" — FACTUAL ONLY. What happened. Neutral. No strategic analysis. No "why it matters." 2 sentences max.
2. "whyItMatters" — MACRO strategic significance. Geopolitical, economic, or technological context. No recap of events from theBriefing. 2-3 sentences.
3. "whyItMattersToYou" — ONLY if reader profile provided. Deeply personalized to THAT career and interests. Explain practical + strategic relevance FOR THEM. Attention priority. Must read differently than fields 1-2. 2-3 sentences. If no profile, omit key or use empty string.
4. "strategicImplications" — sector/macro implications. Empty string if marginal.
5. "perspectives" — how stakeholders differ. Empty if thin.
6. "marketRead" — market reaction lens. Empty if not market-relevant.
7. "sourceLens" — how outlets frame the story. Empty if thin.

Banned phrases across all fields: "fast-paced", "landscape", "this article", "AI", "in today's world".

Return JSON only:
{
  "theBriefing": "",
  "whyItMatters": "",
  "whyItMattersToYou": "",
  "strategicImplications": "",
  "perspectives": "",
  "marketRead": "",
  "sourceLens": ""
}`;
}

function parsePackage(
  content: string,
  profileFingerprint: string
): StoryIntelligencePackage | null {
  try {
    const p = JSON.parse(content) as Record<string, unknown>;
    const req = (k: string) =>
      typeof p[k] === "string" ? (p[k] as string).trim() : "";

    const theBriefing = req("theBriefing");
    const whyItMatters = req("whyItMatters");
    if (!theBriefing || !whyItMatters) return null;

    const opt = (k: string) => {
      const v = req(k);
      return v.length > 20 ? v.slice(0, 450) : undefined;
    };

    const personalized = req("whyItMattersToYou");

    return {
      theBriefing: theBriefing.slice(0, 420),
      whyItMatters: whyItMatters.slice(0, 450),
      whyItMattersToYou: personalized
        ? personalized.slice(0, 500)
        : undefined,
      strategicImplications: opt("strategicImplications"),
      perspectives: opt("perspectives"),
      marketRead: opt("marketRead"),
      sourceLens: opt("sourceLens"),
      generatedAt: new Date().toISOString(),
      profileFingerprint,
      generatedBy: "openai",
    };
  } catch {
    return null;
  }
}

export async function generateIntelligenceOpenAI(
  story: Story,
  profile: OnboardingProfile | null,
  profileFingerprint: string
): Promise<
  | { ok: true; package: StoryIntelligencePackage }
  | { ok: false; error: string }
> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "OPENAI_API_KEY is not configured" };
  }

  const personalized = profile && hasPersonalizationProfile(profile);

  try {
    const res = await fetch(OPENAI_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
        temperature: personalized ? 0.55 : 0.4,
        max_tokens: 950,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You produce premium intelligence briefings. Each JSON field must be semantically distinct. JSON only.",
          },
          { role: "user", content: buildUnifiedPrompt(story, profile) },
        ],
      }),
    });

    const data = (await res.json()) as {
      error?: { message?: string };
      choices?: { message?: { content?: string } }[];
    };

    if (!res.ok) {
      return {
        ok: false,
        error: data.error?.message ?? `OpenAI ${res.status}`,
      };
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) return { ok: false, error: "Empty OpenAI response" };

    const pkg = parsePackage(content, profileFingerprint);
    if (!pkg) return { ok: false, error: "Invalid intelligence JSON" };

    return { ok: true, package: pkg };
  } catch {
    return { ok: false, error: "OpenAI unreachable" };
  }
}
