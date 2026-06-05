import type { WeeklyBriefingSelection } from "@/lib/briefing/weekly-selection";
import type { WeeklyBriefingMode } from "@/lib/briefing/weekly-engine";
import {
  buildThematicForYouHeadline,
  humanizeClusterLabel,
  isForbiddenGenericForYouTitle,
} from "@/lib/briefing/shared/for-you-corpus-signals";

export function deriveThematicForYouHeadline(
  selection: WeeklyBriefingSelection
): string {
  return normalizeWeeklyHeadline(
    buildThematicForYouHeadline(selection),
    "for-you"
  );
}
import {
  isArticleLikeHeadline,
  hasDuplicatedHeadlinePhrase,
  normalizeThesisHeadline,
  rejectDuplicateHeadline,
} from "@/lib/briefing/thesis-title";
import type { BriefingCadence } from "@/lib/briefing/types";
import type { OnboardingProfile, Story } from "@/lib/types";

const TITLE_MAX: Record<WeeklyBriefingMode, number> = {
  "for-you": 88,
  global: 92,
};

const SUMMARY_MAX = 480;
const SUMMARY_MAX_SENTENCES_GLOBAL = 3;
const SUMMARY_MAX_SENTENCES_FOR_YOU = 5;
const SUMMARY_MAX_FOR_YOU = 560;
const SIGNAL_MAX = 200;

const LIST_LIKE =
  /;|(\b(and|while|as)\b[^.]{0,80}\b(and|while)\b)|^(\d+[\.\)]\s)/i;

export function isListLikeHeadline(headline: string): boolean {
  const h = headline.trim();
  if (!h) return true;
  if (h.includes(";")) return true;
  if ((h.match(/,/g) ?? []).length >= 2) return true;
  if (LIST_LIKE.test(h)) return true;
  if (h.split(/\s+/).length > 14) return true;
  if (h.length > 110) return true;
  return false;
}

/** Trim to word boundary — no ellipsis. */
export function compressToTitle(text: string, maxChars: number): string {
  let cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.includes(";")) {
    cleaned = cleaned.split(";")[0]!.trim();
  }
  if ((cleaned.match(/,/g) ?? []).length >= 2) {
    cleaned = cleaned.split(",")[0]!.trim();
  }
  if (cleaned.length <= maxChars) return cleaned;
  const slice = cleaned.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  return lastSpace > 24 ? slice.slice(0, lastSpace).trim() : slice.trim();
}

export function normalizeWeeklyHeadline(
  raw: string,
  mode: WeeklyBriefingMode,
  fallbackSource?: string
): string {
  const max = TITLE_MAX[mode];
  let headline = raw.replace(/\s+/g, " ").trim();

  if (!headline || isListLikeHeadline(headline)) {
    headline = fallbackSource?.trim() ?? headline;
  }

  headline = headline.replace(/^["'“”]+|["'“”]+$/g, "");
  headline = compressToTitle(headline, max);

  if (mode === "for-you" && headline.length > 0) {
    headline = headline.replace(/^(this week,?|weekly:?)\s*/i, "");
  }

  headline = rejectDuplicateHeadline(headline, fallbackSource?.trim() ?? headline);

  return headline;
}

function limitSentences(text: string, maxSentences: number): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (!sentences || sentences.length <= maxSentences) return text.trim();
  return sentences.slice(0, maxSentences).join(" ").trim();
}

/** Preserve thematic paragraph structure for global synthesis (no 3-sentence crush). */
export function formatGlobalStructuredOverview(text: string): string {
  let summary = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  summary = summary.replace(/\.\.\.+$/g, ".").replace(/…$/g, "");
  const maxChars = 1400;
  if (summary.length <= maxChars) return summary;

  const blocks = summary.split(/\n\n+/);
  let out = "";
  for (const block of blocks) {
    const next = out ? `${out}\n\n${block}` : block;
    if (next.length > maxChars) break;
    out = next;
  }
  return out || summary.slice(0, maxChars).trim();
}

export function normalizeWeeklySummary(
  raw: string,
  mode: WeeklyBriefingMode = "global"
): string {
  const maxSentences =
    mode === "for-you"
      ? SUMMARY_MAX_SENTENCES_FOR_YOU
      : SUMMARY_MAX_SENTENCES_GLOBAL;
  const maxChars = mode === "for-you" ? SUMMARY_MAX_FOR_YOU : SUMMARY_MAX;

  let summary = raw.replace(/\s+/g, " ").trim();
  summary = summary.replace(/\.\.\.+$/g, ".").replace(/…$/g, "");
  summary = limitSentences(summary, maxSentences);

  if (summary.length <= maxChars) {
    return formatScannableSummary(summary, maxSentences);
  }

  const chunk = summary.slice(0, maxChars);
  const lastEnd = Math.max(
    chunk.lastIndexOf("."),
    chunk.lastIndexOf("!"),
    chunk.lastIndexOf("?")
  );
  if (lastEnd > maxChars * 0.55) {
    return formatScannableSummary(
      chunk.slice(0, lastEnd + 1).trim(),
      maxSentences
    );
  }
  const lastSpace = chunk.lastIndexOf(" ");
  return formatScannableSummary(
    (lastSpace > 40 ? chunk.slice(0, lastSpace) : chunk).trim(),
    maxSentences
  );
}

/** Break into short blocks for homepage scanning. */
function formatScannableSummary(text: string, maxSentences: number): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (!sentences || sentences.length < 2) return text.trim();
  return sentences
    .slice(0, maxSentences)
    .map((s) => s.trim())
    .join("\n\n");
}

export function normalizeKeySignal(raw: string): string {
  const signal = raw.replace(/\s+/g, " ").trim().replace(/…+$/g, "");
  if (signal.length <= SIGNAL_MAX) return signal;
  const chunk = signal.slice(0, SIGNAL_MAX);
  const lastEnd = chunk.lastIndexOf(".");
  if (lastEnd > 40) return chunk.slice(0, lastEnd + 1).trim();
  return compressToTitle(chunk, SIGNAL_MAX);
}

function leadInsightPhrase(story: Story): string {
  const blob = `${story.headline} ${story.summary}`;
  const first = blob.split(/[.!?]/)[0]?.trim() ?? story.headline;
  return compressToTitle(first, TITLE_MAX.global);
}

function uniqueThreadLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const label of labels) {
    const key = label.trim().toLowerCase().replace(/\s+/g, " ");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(label.trim());
  }
  return out;
}

function deriveForYouMultiHeadline(
  selection: WeeklyBriefingSelection,
  _profile: OnboardingProfile | null
): string {
  return deriveThematicForYouHeadline(selection);
}

function deriveGlobalMultiHeadline(selection: WeeklyBriefingSelection): string {
  const labels = uniqueThreadLabels(
    selection.threads
      .slice(0, 3)
      .map((t) => t.label.split("&")[0]?.trim() ?? t.label)
      .filter(Boolean)
  );

  if (labels.length >= 2) {
    const combined = labels.slice(0, 2).join(" And ");
    const normalized = normalizeWeeklyHeadline(combined, "global");
    if (!hasDuplicatedHeadlinePhrase(normalized)) {
      return normalized;
    }
  }

  return "Several Strategic Themes Converged";
}

function deriveGlobalMultiSummary(selection: WeeklyBriefingSelection): string {
  const threads = selection.threads.slice(0, 5);
  const blocks = threads.map((thread, idx) => {
    const lead = thread.stories[0];
    const fact = lead
      ? (lead.articleBody ?? lead.rawExcerpt ?? lead.summary)
          .split(/[.!?]/)[0]
          ?.trim()
      : thread.label;
    const src = new Set(thread.stories.map((s) => s.source)).size;
    return `Theme ${idx + 1}: ${thread.label}\n${fact} (${thread.stories.length} articles, ${src} sources)`;
  });

  return formatGlobalStructuredOverview(
    `What happened: ${threads.length} narrative themes shaped the period.\n\n${blocks.join("\n\n")}\n\nThese threads may reinforce or tension each other — watch which gain tier-1 follow-up first.`
  );
}

export function deriveFallbackHeadline(
  selected: Story[],
  mode: WeeklyBriefingMode,
  profile: OnboardingProfile | null,
  selection?: WeeklyBriefingSelection
): string {
  const cadence: BriefingCadence = selection?.cadence ?? "weekly";
  const lens = selection?.lens ?? (cadence === "daily" ? "event" : "pattern");

  if (mode === "for-you" && selection && selection.threads.length > 1) {
    return deriveForYouMultiHeadline(selection, profile);
  }
  if (mode === "global" && selection && selection.threads.length > 1) {
    return deriveGlobalMultiHeadline(selection);
  }
  const lead = selected[0];
  if (!lead) {
    if (mode === "for-you" && selection) {
      return deriveThematicForYouHeadline(selection);
    }
    return lens === "event"
      ? "One Material Change In The Last Day"
      : "A Strategic Pattern Emerged This Week";
  }

  const clusterLabel = selection?.threads[0]?.label?.trim();
  const thesisFallback =
    mode === "for-you" && selection
      ? deriveThematicForYouHeadline(selection)
      : lens === "pattern"
        ? cadence === "weekly"
          ? "A Strategic Pattern Emerged Across The Week"
          : "One Development Stood Out"
        : "One Material Change In The Last Day";

  if (
    clusterLabel &&
    !isListLikeHeadline(clusterLabel) &&
    !isArticleLikeHeadline(clusterLabel) &&
    !hasDuplicatedHeadlinePhrase(clusterLabel)
  ) {
    const normalized = normalizeThesisHeadline(
      clusterLabel,
      mode,
      cadence,
      thesisFallback
    );
    return rejectDuplicateHeadline(normalized, thesisFallback);
  }

  const base = leadInsightPhrase(lead);

  if (!isListLikeHeadline(base) && !isArticleLikeHeadline(base)) {
    return normalizeThesisHeadline(base, mode, cadence, thesisFallback);
  }

  if (mode === "for-you" && selection) {
    const thematic = deriveThematicForYouHeadline(selection);
    if (!isForbiddenGenericForYouTitle(thematic)) return thematic;
  }

  return normalizeThesisHeadline(
    lead.headline,
    mode,
    cadence,
    thesisFallback
  );
}

function deriveForYouMultiSummary(
  selection: WeeklyBriefingSelection,
  profile: OnboardingProfile | null
): string {
  const threads = [...selection.threads]
    .sort((a, b) => b.personalScore - a.personalScore)
    .slice(0, 4);
  const parts = threads.map((thread) => {
    const lead = thread.stories[0];
    const topic = humanizeClusterLabel(thread.label);
    const fact = lead
      ? (lead.articleBody ?? lead.rawExcerpt ?? lead.summary)
          .split(/[.!?]/)[0]
          ?.trim()
      : topic;
    return `${topic}: ${fact}`;
  });

  const focus =
    profile?.interests?.slice(0, 3).join(", ") ??
    profile?.career ??
    "your priorities";
  return normalizeWeeklySummary(
    `What happened: ${threads.length} storylines relevant to ${focus} moved in parallel. ${parts.join(" ")} See Impact for how they connect to your priorities; Watch lists the next confirmations to track.`,
    "for-you"
  );
}

export function deriveFallbackSummary(
  selected: Story[],
  mode: WeeklyBriefingMode,
  profile: OnboardingProfile | null,
  selection?: WeeklyBriefingSelection
): string {
  if (mode === "for-you" && selection && selection.threads.length > 1) {
    return deriveForYouMultiSummary(selection, profile);
  }
  if (mode === "global" && selection && selection.threads.length > 1) {
    return deriveGlobalMultiSummary(selection);
  }

  const lead = selected[0];
  const mechanism = lead
    ? (lead.articleBody ?? lead.rawExcerpt ?? lead.summary)
        .split(/[.!?]/)[0]
        ?.trim()
    : "Several developments moved in parallel";

  if (mode === "for-you" && profile) {
    const career = profile.career ?? "reader";
    return normalizeWeeklySummary(
      `${mechanism} For you as a ${career}, the open question is whether this changes a decision you own soon. Watch for a follow-up that confirms or contradicts it.`,
      "for-you"
    );
  }

  return normalizeWeeklySummary(
    `${mechanism} If the trend holds, more actors in this lane may respond — but scale is still unclear. Watch the next official step or earnings print that would confirm direction.`,
    "global"
  );
}
