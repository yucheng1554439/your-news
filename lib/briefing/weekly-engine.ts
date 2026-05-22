import "server-only";

import { createHash } from "crypto";
import { createMemoryStore } from "@/lib/cache/memory-store";
import { deriveKeySignal } from "@/lib/briefing/key-signal";
import { getCategoryLabel } from "@/lib/data/categories";
import { computeUserRelevanceScore } from "@/lib/personalization/engine";
import { rankStoriesGlobal } from "@/lib/personalization/engine";
import type { OnboardingProfile, Story } from "@/lib/types";

export type WeeklyBriefingMode = "for-you" | "global";

export type WeeklyBriefing = {
  weekLabel: string;
  headline: string;
  summary: string;
  /** Strategic takeaway or key signal — shown in hero footer. */
  keySignal: string;
  mode: WeeklyBriefingMode;
};

const CACHE_TTL_MS = 30 * 60 * 1000;
const OPENAI_API = "https://api.openai.com/v1/chat/completions";

type BriefingCacheEntry = {
  generatedAt: string;
  briefing: WeeklyBriefing;
};

const briefingStore = createMemoryStore<BriefingCacheEntry>({
  ttlMs: CACHE_TTL_MS,
  maxEntries: 80,
});

function getWeekRangeLabel(): string {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(weekAgo)} – ${fmt(now)}`;
}

function briefingCacheKey(
  mode: WeeklyBriefingMode,
  profile: OnboardingProfile | null,
  stories: Story[]
): string {
  const slugs = stories
    .slice(0, 8)
    .map((s) => s.slug)
    .join(",");
  const profilePart = profile
    ? createHash("sha256")
        .update(
          JSON.stringify({
            mode,
            interests: profile.interests,
            career: profile.career,
            focus: profile.focusType,
          })
        )
        .digest("hex")
        .slice(0, 12)
    : "anon";
  return `${mode}-${profilePart}-${createHash("sha256").update(slugs).digest("hex").slice(0, 16)}`;
}

function readBriefingCache(key: string): WeeklyBriefing | null {
  const entry = briefingStore.get(key);
  return entry?.briefing ?? null;
}

function writeBriefingCache(key: string, briefing: WeeklyBriefing): void {
  briefingStore.set(key, {
    generatedAt: new Date().toISOString(),
    briefing,
  });
}

function selectStoriesForMode(
  stories: Story[],
  mode: WeeklyBriefingMode,
  profile: OnboardingProfile | null
): Story[] {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - weekMs;
  const recent = stories.filter(
    (s) => new Date(s.publishedAt).getTime() >= cutoff
  );
  const pool = recent.length >= 3 ? recent : stories;

  if (mode === "global") {
    return rankStoriesGlobal(pool).slice(0, 8);
  }

  if (!profile) return pool.slice(0, 8);

  return [...pool]
    .sort(
      (a, b) =>
        computeUserRelevanceScore(b, profile) -
        computeUserRelevanceScore(a, profile)
    )
    .slice(0, 8);
}

function buildSyncBriefing(
  stories: Story[],
  mode: WeeklyBriefingMode,
  profile: OnboardingProfile | null
): WeeklyBriefing {
  const selected = selectStoriesForMode(stories, mode, profile);
  const headlines = selected.map((s) => s.headline).slice(0, 4);
  const categories = [...new Set(selected.map((s) => s.category))].slice(0, 2);
  const theme =
    categories.length > 0
      ? categories.map((c) => getCategoryLabel(c).toLowerCase()).join(" and ")
      : "global developments";

  if (mode === "for-you" && profile) {
    const career = profile.career ?? "your role";
    const interests =
      profile.interests.length > 0
        ? profile.interests.join(", ")
        : "your interests";

    return {
      mode,
      weekLabel: getWeekRangeLabel(),
      headline: `Your week in ${theme}.`,
      summary: `From your lens as a ${career} tracking ${interests}, the desk surfaced ${selected.length} stories that matter most to your briefing. Leading threads include: ${headlines.slice(0, 2).join("; ")}. Prioritize what changes decisions you own; treat the rest as peripheral scan.`,
      keySignal: deriveKeySignal(selected),
    };
  }

  return {
    mode,
    weekLabel: getWeekRangeLabel(),
    headline: `Global intelligence: ${theme}.`,
    summary: `This week's highest-signal global coverage centers on ${theme}. Key headlines: ${headlines.slice(0, 2).join("; ")}. The desk weighted editorial importance and recency — not every headline warrants action.`,
    keySignal: deriveKeySignal(selected),
  };
}

async function buildAIBriefing(
  stories: Story[],
  mode: WeeklyBriefingMode,
  profile: OnboardingProfile | null
): Promise<WeeklyBriefing | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const selected = selectStoriesForMode(stories, mode, profile);
  const storyLines = selected
    .map(
      (s) =>
        `- [${getCategoryLabel(s.category)}] ${s.headline} (${s.source}): ${s.summary.slice(0, 120)}`
    )
    .join("\n");

  const modeInstruction =
    mode === "for-you" && profile
      ? `Write for THIS reader: career=${profile.career}, interests=${profile.interests.join(", ")}, focus=${profile.focusType}.`
      : "Write for a global executive reader — most important stories worldwide this week.";

  try {
    const res = await fetch(OPENAI_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.45,
        max_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Weekly intelligence editor. Calm, strategic, concise. JSON only.",
          },
          {
            role: "user",
            content: `${modeInstruction}

Stories this week:
${storyLines}

Return JSON:
{
  "headline": "short editorial headline",
  "summary": "2-3 sentences — synthesize themes from THESE stories only",
  "keySignal": "1 sentence — dominant theme OR key signal headline (specific, not generic)"
}`,
          },
        ],
      }),
    });

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as {
      headline?: string;
      summary?: string;
      keySignal?: string;
      editorsNote?: string;
    };

    if (!parsed.headline || !parsed.summary) return null;

    const keySignal =
      parsed.keySignal?.trim() ||
      parsed.editorsNote?.trim() ||
      deriveKeySignal(selected);

    return {
      mode,
      weekLabel: getWeekRangeLabel(),
      headline: parsed.headline.slice(0, 120),
      summary: parsed.summary.slice(0, 500),
      keySignal: keySignal.slice(0, 220),
    };
  } catch {
    return null;
  }
}

export async function resolveWeeklyBriefing(
  stories: Story[],
  mode: WeeklyBriefingMode,
  profile: OnboardingProfile | null
): Promise<WeeklyBriefing> {
  const selected = selectStoriesForMode(stories, mode, profile);
  const cacheKey = briefingCacheKey(mode, profile, selected);

  const cached = readBriefingCache(cacheKey);
  if (cached) return cached;

  const ai = await buildAIBriefing(stories, mode, profile);
  const briefing =
    ai ?? buildSyncBriefing(stories, mode, profile);

  writeBriefingCache(cacheKey, briefing);
  return briefing;
}
