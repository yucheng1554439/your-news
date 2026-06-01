import "server-only";

import {
  getArticleContext,
  getClusterArticleContext,
} from "@/lib/intelligence/article-context";
import {
  STORY_SECTIONS,
  WRITING_RULES,
} from "@/lib/intelligence/section-purposes";
import { PERSONAL_ADVISOR_MANDATE } from "@/lib/personalization/advisor-frame";
import { buildProfileStyleBlock } from "@/lib/personalization/profile-style";
import { buildReaderNote, canPersonalize } from "@/lib/personalization/context";
import type { ClusterIntelligence, OnboardingProfile, Story } from "@/lib/types";

export function buildUnifiedIntelligencePrompt(
  story: Story,
  profile: OnboardingProfile | null,
  cluster?: ClusterIntelligence | null,
  materialStories?: Story[]
): string {
  const article =
    cluster && materialStories && materialStories.length > 1
      ? getClusterArticleContext(story, cluster, materialStories)
      : getArticleContext(story);
  const reader =
    profile && canPersonalize({ profile })
      ? buildReaderNote(profile)
      : null;

  const personalized = Boolean(reader);
  const styleBlock = personalized
    ? buildProfileStyleBlock(profile, "daily")
    : "";
  const advisorBlock = personalized ? PERSONAL_ADVISOR_MANDATE : "";

  const personalBlock = reader
    ? `<WHY_THIS_MATTERS_TO_YOU>
${STORY_SECTIONS.whyItMattersToYou.purpose} — ${STORY_SECTIONS.whyItMattersToYou.task}
</WHY_THIS_MATTERS_TO_YOU>`
    : "";

  return `${WRITING_RULES}
${styleBlock}
${advisorBlock}

SOURCE:
${article}

${reader ? `${reader}\n` : ""}
Read the FULL ARTICLE TEXT first. Each tagged section has ONE job. Do not repeat the same point across sections. Do not paraphrase the headline — extract what changed and who is affected from the body. Stay evidence-based; avoid macro fanfiction and finance jargon.
${cluster && materialStories && materialStories.length > 1 ? "\nIMPORTANT: When corroborating articles are provided, anchor THE_BRIEFING and WHY_IT_MATTERS to the lead story headline above — synthesize THIS event only. Ignore any unrelated weekly context." : ""}

Respond using these exact tags (plain text inside each tag, no JSON):

<THE_BRIEFING>
${STORY_SECTIONS.theBriefing.purpose} — ${STORY_SECTIONS.theBriefing.task}
</THE_BRIEFING>

<WHY_IT_MATTERS>
${STORY_SECTIONS.whyItMatters.purpose} — ${STORY_SECTIONS.whyItMatters.task}
</WHY_IT_MATTERS>

${personalBlock}`;
}
