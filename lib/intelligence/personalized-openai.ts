import "server-only";

import { getCategoryLabel } from "@/lib/data/categories";
import { getArticleContext } from "@/lib/intelligence/article-context";
import {
  buildReaderContext,
  hasPersonalizationProfile,
} from "@/lib/intelligence/profile-context";
import type { OnboardingProfile, Story } from "@/lib/types";

const OPENAI_API = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";

const CAREER_OPENING: Record<
  NonNullable<OnboardingProfile["career"]>,
  string
> = {
  engineer:
    "Open by naming a concrete engineering implication (systems, tooling, risk, shipping).",
  investor:
    "Open by naming a concrete capital or portfolio implication (positioning, risk, timing).",
  founder:
    "Open by naming a concrete company-building implication (competition, runway, narrative).",
  executive:
    "Open by naming a concrete organizational implication (exposure, planning, stakeholders).",
  researcher:
    "Open by naming a concrete research or evidence implication (method, funding, policy boundary).",
};

function buildPersonalizedPrompt(
  story: Story,
  profile: OnboardingProfile,
  coreBriefing: string,
  coreWhy: string
): string {
  const careerRule = profile.career
    ? CAREER_OPENING[profile.career]
    : "Open with role-specific relevance.";

  return `Write ONLY "whyItMattersToYou" for ONE reader. This must be unmistakably different from a software engineer vs investor vs founder.

${buildReaderContext(profile)}

${careerRule}

Do NOT repeat these global sections verbatim:
- Briefing: ${coreBriefing.slice(0, 200)}
- Why it matters (global): ${coreWhy.slice(0, 200)}

Article:
${getArticleContext(story)}
Category: ${getCategoryLabel(story.category)}

Explain: why THIS reader should care, practical implications, strategic implications, career relevance, and attention priority (scan vs deep read vs interrupt).

Return JSON only: { "whyItMattersToYou": "2-3 sentences" }`;
}

export async function generatePersonalizedIntelligenceOpenAI(
  story: Story,
  profile: OnboardingProfile,
  coreBriefing: string,
  coreWhy: string
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  if (!hasPersonalizationProfile(profile)) {
    return { ok: false, error: "Profile incomplete" };
  }

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
        temperature: 0.72,
        max_tokens: 280,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Personal intelligence editor. Each career lens must sound different. JSON only.",
          },
          {
            role: "user",
            content: buildPersonalizedPrompt(
              story,
              profile,
              coreBriefing,
              coreWhy
            ),
          },
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
    if (!content) return { ok: false, error: "Empty response" };

    const parsed = JSON.parse(content) as { whyItMattersToYou?: string };
    const text = parsed.whyItMattersToYou?.trim();
    if (!text) return { ok: false, error: "Missing personalized field" };

    return { ok: true, text: text.slice(0, 500) };
  } catch {
    return { ok: false, error: "OpenAI unreachable" };
  }
}
