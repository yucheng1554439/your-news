import "server-only";

import { normalizeWeeklySummary } from "@/lib/briefing/format-weekly";
import {
  collectForYouCorpusSignals,
  humanizeClusterLabel,
} from "@/lib/briefing/shared/for-you-corpus-signals";
import type { WeeklyBriefingSelection } from "@/lib/briefing/weekly-selection";
import type { OnboardingProfile } from "@/lib/types";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";

const RELEVANCE_SCORE_THRESHOLD = 5;

function firstSentence(text: string | undefined): string {
  if (!text?.trim()) return "";
  return text.split(/[.!?]/)[0]?.trim() ?? text.trim();
}

function collectProfileFocus(
  profile: OnboardingProfile | null,
  intelligence?: UserIntelligenceProfile | null
): string[] {
  const out: string[] = [];
  if (profile?.interests?.length) out.push(...profile.interests);
  for (const t of intelligence?.primaryThemes ?? []) {
    if (t.label) out.push(t.label);
  }
  for (const id of profile?.topicPreferences?.moreOf ?? []) {
    out.push(id.replace(/-/g, " "));
  }
  return [...new Set(out.map((s) => s.trim()).filter(Boolean))];
}

function threadDigest(
  thread: WeeklyBriefingSelection["threads"][0]
): string {
  const cluster = thread.cluster;
  if (cluster?.summary?.trim()) {
    return firstSentence(cluster.summary);
  }
  const lead = thread.stories[0];
  if (!lead) return humanizeClusterLabel(thread.label);
  return firstSentence(
    lead.articleBody ?? lead.rawExcerpt ?? lead.summary ?? lead.headline
  );
}

function narrativeThreadSentence(
  thread: WeeklyBriefingSelection["threads"][0],
  entityHint: string | undefined
): string {
  const topic = humanizeClusterLabel(thread.label);
  const digest = threadDigest(thread);
  const fact = digest
    ? digest.charAt(0).toLowerCase() + digest.slice(1)
    : "coverage is still forming";
  const entityClause = entityHint
    ? ` with implications for ${entityHint}`
    : "";
  return `${topic} is shaping decisions${entityClause}: ${fact}.`;
}

export function deriveForYouWeeklyImpact(
  profile: OnboardingProfile | null,
  selection: WeeklyBriefingSelection,
  intelligence?: UserIntelligenceProfile | null
): string {
  const signals = collectForYouCorpusSignals(selection);
  const focus = collectProfileFocus(profile, intelligence);
  const focusPhrase =
    focus.length > 0 ? focus.slice(0, 5).join(", ") : "your stated priorities";
  const career = profile?.career ?? "professional";

  const ranked = [...selection.threads].sort(
    (a, b) => b.personalScore - a.personalScore
  );
  const primary = ranked.filter((t) => t.personalScore >= RELEVANCE_SCORE_THRESHOLD);
  const threads = (primary.length > 0 ? primary : ranked).slice(0, 4);

  const careerLens: Record<NonNullable<OnboardingProfile["career"]>, string> = {
    engineer:
      "engineering roadmaps, infrastructure and compute demand, vendor exposure, hiring pace, and build-vs-buy trade-offs",
    investor:
      "portfolio exposure, sector rotation, capital allocation, and earnings-sensitive positioning",
    founder:
      "fundraising timing, customer budgets, GTM sequencing, and competitive moats",
    executive:
      "operating risk, partner dependencies, compliance exposure, and board-level capital decisions",
    researcher:
      "evidence quality, funding implications, and claims requiring primary-source verification",
  };

  const lens = profile?.career
    ? careerLens[profile.career]
    : "decisions you own on priorities, budget, and timing";

  const entityPool = signals.entityDisplay;
  const narratives = threads.map((t, idx) =>
    narrativeThreadSentence(t, entityPool[idx] ?? entityPool[0])
  );

  const behaviorNote =
    intelligence && intelligence.behaviorConfidence >= 0.35
      ? ` Your reading patterns emphasize ${intelligence.effectiveLens}; weight threads that match that lens first.`
      : "";

  const intro =
    threads.length > 1
      ? `For your ${career} lens on ${focusPhrase}, ${threads.length} parallel storylines from this period intersect.`
      : `For your ${career} lens on ${focusPhrase}, one dominant storyline is driving the period.`;

  return normalizeWeeklySummary(
    `${intro} ${narratives.join(" ")} Together they touch ${lens}.${behaviorNote} Prioritize follow-through on the highest-relevance threads first; treat single-source claims as provisional until tier-1 corroboration lands.`,
    "for-you"
  );
}
