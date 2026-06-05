import "server-only";

import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import type {
  BriefingMode,
  IntelligenceBriefing,
} from "@/lib/briefing/types";
import type {
  WeeklyBriefingSelection,
  NarrativeThread,
} from "@/lib/briefing/weekly-selection";
import { allStoriesFromSelection } from "@/lib/briefing/weekly-selection";
import { globalBriefingSectionIsWeak } from "@/lib/briefing/shared/section-heuristics";
import {
  isGenericBriefingSection,
} from "@/lib/briefing/shared/impact-fallback";
import {
  deriveFallbackSummary,
  formatGlobalStructuredOverview,
  normalizeWeeklySummary,
} from "@/lib/briefing/format-weekly";
import { deriveForYouWeeklyImpact } from "@/lib/briefing/for-you-impact";
import { deriveForYouWeeklyWatchText } from "@/lib/briefing/for-you-watch";
import { repairForYouBriefingSections } from "@/lib/briefing/repair-for-you-sections";
import type { OnboardingProfile, Story } from "@/lib/types";

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
  for (const t of intelligence?.topThemes ?? []) {
    if (t.label && !out.includes(t.label)) out.push(t.label);
  }
  for (const id of profile?.topicPreferences?.moreOf ?? []) {
    out.push(id.replace(/-/g, " "));
  }
  return [...new Set(out.map((s) => s.trim()).filter(Boolean))];
}

export function countRelevantStoriesForProfile(
  stories: Story[],
  profile: OnboardingProfile | null,
  intelligence?: UserIntelligenceProfile | null
): number {
  if (!profile?.completed && !profile?.interests?.length) return stories.length;

  const focus = collectProfileFocus(profile, intelligence);
  if (focus.length === 0) return stories.length;

  let count = 0;
  for (const story of stories) {
    const blob =
      `${story.headline} ${story.summary} ${(story.strategicTags ?? []).join(" ")} ${(story.tags ?? []).join(" ")}`.toLowerCase();
    const tagHit = focus.some((f) => blob.includes(f.toLowerCase()));
    if (tagHit) count += 1;
  }
  return count;
}

function threadDigest(thread: NarrativeThread): string {
  const cluster = thread.cluster;
  if (cluster?.summary?.trim()) {
    return firstSentence(cluster.summary);
  }
  const lead = thread.stories[0];
  if (!lead) return thread.label;
  return firstSentence(
    lead.articleBody ?? lead.rawExcerpt ?? lead.summary ?? lead.headline
  );
}

function sourcesInThread(thread: NarrativeThread): number {
  return new Set(thread.stories.map((s) => s.source).filter(Boolean)).size;
}

export function deriveGlobalWeeklyOverview(
  selection: WeeklyBriefingSelection
): string {
  const threads = selection.threads.slice(0, 5);
  const allStories = allStoriesFromSelection(selection);
  const totalStories = allStories.length;
  const totalSources = new Set(allStories.map((s) => s.source)).size;

  if (threads.length === 0) {
    return "Several developments moved in parallel across the desk this period.";
  }

  if (threads.length === 1 && totalStories >= 20) {
    console.warn(
      "[BRIEFING_CLUSTER_WARNING]",
      JSON.stringify({
        reason: "single_thread_global_overview",
        storiesProcessed: totalStories,
        narrativesProcessed: 1,
      })
    );
  }

  const themeBlocks = threads.map((t, idx) => {
    const digest = threadDigest(t);
    const src = sourcesInThread(t);
    return `Theme ${idx + 1}: ${t.label}\n${digest} This thread draws on ${t.stories.length} articles across ${src} sources.`;
  });

  const intro = `What happened: ${totalStories} stories from ${totalSources} outlets organized into ${threads.length} strategic themes.`;
  const connective =
    threads.length >= 2
      ? "These themes ran in parallel — the strategic question is where they reinforce (capital, policy, supply chain) versus where they tension each other."
      : "Watch whether follow-up reporting confirms direction or fragments the narrative.";

  return formatGlobalStructuredOverview(
    `${intro}\n\n${themeBlocks.join("\n\n")}\n\n${connective}`
  );
}

export function deriveGlobalWeeklyImpact(
  selection: WeeklyBriefingSelection
): string {
  const threads = selection.threads.slice(0, 4);
  const implications = threads.map((t, idx) => {
    const digest = threadDigest(t);
    return `Theme ${idx + 1} (${t.label}): if reporting holds, ${digest.toLowerCase()} may shift capital allocation, policy timelines, or competitive positioning in this lane.`;
  });

  return formatGlobalStructuredOverview(
    `Why it matters: ${implications.join(" ")} Together, these threads define where risk and opportunity concentrated this period — not as isolated headlines, but as linked market and policy dynamics.`
  );
}

export function deriveWeeklyWatchItems(
  selection: WeeklyBriefingSelection,
  mode: BriefingMode
): string[] {
  if (mode === "for-you") {
    return deriveForYouWeeklyWatchText(selection)
      .split(/\n\n+/)
      .filter(Boolean);
  }
  const threads = selection.threads.slice(0, 4);
  return threads.map((t) => {
    const digest = threadDigest(t);
    return `Monitor: ${t.label} — ${firstSentence(digest)}`;
  });
}

/** Fill missing or generic sections from corpus + profile. */
export function completeBriefingSections(
  briefing: IntelligenceBriefing,
  selection: WeeklyBriefingSelection,
  profile: OnboardingProfile | null,
  intelligence?: UserIntelligenceProfile | null
): IntelligenceBriefing {
  if (briefing.mode === "for-you") {
    return repairForYouBriefingSections(
      briefing,
      selection,
      profile,
      intelligence
    );
  }

  const pool = allStoriesFromSelection(selection);
  const next: IntelligenceBriefing = { ...briefing };

  const needsGlobalSynthesis =
    selection.threads.length >= 2 || pool.length >= 20;

  if (
    isGenericBriefingSection(next.whatChanged) ||
    (needsGlobalSynthesis && globalBriefingSectionIsWeak(next.whatChanged))
  ) {
    next.whatChanged = deriveGlobalWeeklyOverview(selection);
  }

  if (
    isGenericBriefingSection(next.whyItMatters) ||
    (needsGlobalSynthesis && globalBriefingSectionIsWeak(next.whyItMatters))
  ) {
    next.whyItMatters = deriveGlobalWeeklyImpact(selection);
  }

  if (!next.watchItems?.length || next.watchItems.every((w) => w.length < 20)) {
    next.watchItems = deriveWeeklyWatchItems(selection, next.mode);
    next.keySignal = next.watchItems[0] ?? next.keySignal;
  }

  if (isGenericBriefingSection(next.summary)) {
    next.summary = deriveFallbackSummary(pool, next.mode, profile, selection);
  }

  return next;
}

export function synthesisAuditFromSelection(
  selection: WeeklyBriefingSelection
): {
  clustersIncluded: number;
  personalizedClustersIncluded: number;
  clusterSummaries: Array<{
    id: string;
    label: string;
    personalScore: number;
    storyCount: number;
    sourceCount: number;
  }>;
} {
  const clusterSummaries = selection.threads.map((t) => ({
    id: t.clusterId,
    label: t.label,
    personalScore: t.personalScore,
    storyCount: t.stories.length,
    sourceCount: sourcesInThread(t),
  }));
  return {
    clustersIncluded: selection.threads.length,
    personalizedClustersIncluded:
      selection.mode === "for-you"
        ? selection.threads.filter((t) => t.personalScore >= RELEVANCE_SCORE_THRESHOLD)
            .length
        : selection.threads.length,
    clusterSummaries,
  };
}
