import "server-only";

import { getCategoryLabel } from "@/lib/data/categories";
import { getArticleContext } from "@/lib/intelligence/article-context";
import type { StoryIntelligencePackage } from "@/lib/intelligence/types";
import type { Story } from "@/lib/types";

const OPENAI_API = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";

function buildCorePrompt(story: Story): string {
  const category = getCategoryLabel(story.category);
  const article = getArticleContext(story);

  return `You are a senior intelligence editor. Analyze the article below and write editorial intelligence sections.

${article}

Return JSON only. Fields must NOT repeat each other:
{
  "theBriefing": "2 sentences — factual what happened. Neutral. No strategy.",
  "whyItMatters": "2-3 sentences — macro strategic significance for ${category}. No event recap from theBriefing.",
  "strategicImplications": "1-2 sentences sector/macro impact or empty string",
  "perspectives": "2 sentences stakeholder angles or empty string",
  "marketRead": "1-2 sentences market lens or empty string",
  "sourceLens": "1-2 sentences on how outlets frame this or empty string"
}

Banned: "landscape", "fast-paced", "this article", "AI-generated".`;
}

function parseCore(
  content: string,
  profileFingerprint: string
): Omit<
  StoryIntelligencePackage,
  "whyItMattersToYou"
> | null {
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

    return {
      theBriefing: theBriefing.slice(0, 420),
      whyItMatters: whyItMatters.slice(0, 450),
      strategicImplications: opt("strategicImplications"),
      perspectives: opt("perspectives"),
      marketRead: opt("marketRead"),
      sourceLens: opt("sourceLens"),
      generatedAt: new Date().toISOString(),
      profileFingerprint,
    };
  } catch {
    return null;
  }
}

export async function generateCoreIntelligenceOpenAI(
  story: Story,
  profileFingerprint: string
): Promise<
  | { ok: true; core: Omit<StoryIntelligencePackage, "whyItMattersToYou"> }
  | { ok: false; error: string }
> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, error: "OPENAI_API_KEY is not configured" };

  try {
    const res = await fetch(OPENAI_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
        temperature: 0.35,
        max_tokens: 750,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Premium intelligence editor. Analyze source material. JSON only. Distinct sections.",
          },
          { role: "user", content: buildCorePrompt(story) },
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

    const core = parseCore(content, profileFingerprint);
    if (!core) return { ok: false, error: "Invalid core intelligence JSON" };

    return { ok: true, core };
  } catch {
    return { ok: false, error: "OpenAI unreachable" };
  }
}
