import "server-only";

import { getArticleContext } from "@/lib/intelligence/article-context";
import {
  STORY_SECTIONS,
  WRITING_RULES,
} from "@/lib/intelligence/section-purposes";
import { buildReaderNote, canPersonalize } from "@/lib/personalization/context";
import type { OnboardingProfile, Story } from "@/lib/types";

export function buildUnifiedIntelligencePrompt(
  story: Story,
  profile: OnboardingProfile | null
): string {
  const article = getArticleContext(story);
  const reader =
    profile && canPersonalize({ profile })
      ? buildReaderNote(profile)
      : null;

  const personalBlock = reader
    ? `<WHY_THIS_MATTERS_TO_YOU>
${STORY_SECTIONS.whyItMattersToYou.purpose} — ${STORY_SECTIONS.whyItMattersToYou.task}
</WHY_THIS_MATTERS_TO_YOU>`
    : "";

  return `${WRITING_RULES}

SOURCE:
${article}

${reader ? `${reader}\n` : ""}
Read the FULL ARTICLE TEXT first. Each tagged section has ONE job. Do not repeat the same point across sections. Do not paraphrase the headline — extract what changed and who is affected from the body. Stay evidence-based; avoid macro fanfiction and finance jargon.

Respond using these exact tags (plain text inside each tag, no JSON):

<THE_BRIEFING>
${STORY_SECTIONS.theBriefing.purpose} — ${STORY_SECTIONS.theBriefing.task}
</THE_BRIEFING>

<WHY_IT_MATTERS>
${STORY_SECTIONS.whyItMatters.purpose} — ${STORY_SECTIONS.whyItMatters.task}
</WHY_IT_MATTERS>

${personalBlock}`;
}
