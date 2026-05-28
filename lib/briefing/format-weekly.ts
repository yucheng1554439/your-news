import type { WeeklyBriefingMode } from "@/lib/briefing/weekly-engine";
import type { OnboardingProfile, Story } from "@/lib/types";

const TITLE_MAX: Record<WeeklyBriefingMode, number> = {
  "for-you": 88,
  global: 92,
};

const SUMMARY_MAX = 920;
const SIGNAL_MAX = 280;

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

  return headline;
}

export function normalizeWeeklySummary(raw: string): string {
  let summary = raw.replace(/\s+/g, " ").trim();
  summary = summary.replace(/\.\.\.+$/g, ".").replace(/…$/g, "");

  if (summary.length <= SUMMARY_MAX) return summary;

  const chunk = summary.slice(0, SUMMARY_MAX);
  const lastEnd = Math.max(
    chunk.lastIndexOf("."),
    chunk.lastIndexOf("!"),
    chunk.lastIndexOf("?")
  );
  if (lastEnd > SUMMARY_MAX * 0.55) {
    return chunk.slice(0, lastEnd + 1).trim();
  }
  const lastSpace = chunk.lastIndexOf(" ");
  return (lastSpace > 40 ? chunk.slice(0, lastSpace) : chunk).trim();
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

export function deriveFallbackHeadline(
  selected: Story[],
  mode: WeeklyBriefingMode,
  profile: OnboardingProfile | null
): string {
  const lead = selected[0];
  if (!lead) {
    return mode === "for-you"
      ? "One Development Deserves Your Attention This Week"
      : "Markets And Policy Repriced Together This Week";
  }

  const base = leadInsightPhrase(lead);
  if (!isListLikeHeadline(base)) {
    return normalizeWeeklyHeadline(base, mode, lead.headline);
  }

  if (mode === "for-you" && profile?.career) {
    const careerTitles: Record<
      NonNullable<OnboardingProfile["career"]>,
      string
    > = {
      investor: "Portfolio Risk Is Shifting Faster Than Positioning Suggests",
      engineer: "Enterprise Tech Spending Is Entering A Tighter Phase",
      founder: "Capital Is Getting More Selective Around Growth Bets",
      executive: "Operating Exposure Is Concentrating In A Few Macro Bets",
      researcher: "Evidence Is Moving Faster Than Published Consensus",
    };
    return careerTitles[profile.career];
  }

  return normalizeWeeklyHeadline(
    "Global Risk And Policy Repriced In Parallel",
    mode,
    lead.headline
  );
}

export function deriveFallbackSummary(
  selected: Story[],
  mode: WeeklyBriefingMode,
  profile: OnboardingProfile | null
): string {
  const lead = selected[0];
  const mechanism = lead
    ? (lead.articleBody ?? lead.rawExcerpt ?? lead.summary)
        .split(/[.!?]/)[0]
        ?.trim()
    : "Several developments moved in parallel";

  if (mode === "for-you" && profile) {
    const career = profile.career ?? "reader";
    return normalizeWeeklySummary(
      `${mechanism} For you as a ${career}, the implication is timing: what to hedge, what to accelerate, and what to stop funding. Monitor whether follow-on data confirms the move or reverses it. If confirmation holds, adjust exposure before consensus catches up.`
    );
  }

  return normalizeWeeklySummary(
    `${mechanism} The defining shift is that markets, governments, and supply chains are reacting to the same pressure at once. Watch whether rate, energy, and conflict signals reinforce or diverge next week. If reinforcement continues, expect defensive positioning to extend across assets and capex plans.`
  );
}
