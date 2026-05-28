"use client";

import { motion } from "framer-motion";
import { AnimatedEditorialText } from "@/components/AnimatedEditorialText";
import { IntelligenceRefreshControl } from "@/components/IntelligenceRefreshControl";
import { ToggleTabs, type FeedMode } from "@/components/ToggleTabs";
import { AIStatusBanner } from "@/components/AIStatusBanner";
import type { WeeklyBriefing } from "@/lib/weekly-briefing";

interface HeroSectionProps {
  feedMode: FeedMode;
  onFeedModeChange: (mode: FeedMode) => void;
  briefing: WeeklyBriefing;
  lastUpdated?: number | null;
  storiesFetchedAt?: number;
  hasIntelligenceSnapshot?: boolean;
  persistenceConfigured?: boolean;
  isRefreshing?: boolean;
  onRefreshingChange?: (refreshing: boolean) => void;
}

export function HeroSection({
  feedMode,
  onFeedModeChange,
  briefing,
  lastUpdated = null,
  storiesFetchedAt,
  hasIntelligenceSnapshot = false,
  persistenceConfigured = false,
  isRefreshing = false,
  onRefreshingChange,
}: HeroSectionProps) {
  const animationKey = `${feedMode}-${briefing.mode}-${briefing.headline}`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-neutral-950 px-6 py-10 sm:px-10 sm:py-12"
    >
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-zinc-800/30 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-neutral-800/20 blur-3xl"
        aria-hidden
      />

      {isRefreshing ? (
        <div
          className="relative mb-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <span
            className="h-2 w-2 animate-pulse rounded-full bg-emerald-400/90"
            aria-hidden
          />
          Refreshing intelligence — keeping your current briefing visible
        </div>
      ) : null}

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-3xl flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <span className="uppercase tracking-[0.2em]">
              Weekly Briefing
            </span>
            <span className="text-zinc-600">·</span>
            <span>{briefing.weekLabel}</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-500">
              {feedMode === "personalized" ? "For You" : "Global"}
            </span>
          </div>
          <AIStatusBanner
            generatedBy={briefing.generatedBy}
            aiError={briefing.aiError ?? briefing.openaiError}
            context="weekly"
          />
          <motion.h1
            key={`${animationKey}-headline`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="font-serif text-2xl leading-snug tracking-tight text-white text-balance sm:text-3xl md:text-[2.125rem] md:leading-[1.2]"
          >
            {briefing.headline}
          </motion.h1>
          <AnimatedEditorialText
            animationKey={`${animationKey}-summary`}
            text={briefing.summary}
            animate={!isRefreshing}
            className="max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-[15px] sm:leading-7"
          />
          {briefing.keySignal ? (
            <AnimatedEditorialText
              animationKey={`${animationKey}-signal`}
              text={briefing.keySignal}
              animate={!isRefreshing}
              className="max-w-2xl border-l-2 border-white/20 pl-4 text-sm leading-relaxed text-zinc-400"
            />
          ) : null}
        </div>
        <div className="flex w-full shrink-0 flex-col gap-4 sm:w-auto sm:items-end">
          <IntelligenceRefreshControl
            lastUpdated={lastUpdated}
            storiesFetchedAt={storiesFetchedAt}
            hasSnapshot={hasIntelligenceSnapshot}
            persistenceConfigured={persistenceConfigured}
            isRefreshing={isRefreshing}
            onRefreshingChange={onRefreshingChange}
          />
          <ToggleTabs value={feedMode} onChange={onFeedModeChange} />
        </div>
      </div>
    </motion.section>
  );
}
