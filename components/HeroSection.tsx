"use client";

import { motion } from "framer-motion";
import { ToggleTabs, type FeedMode } from "@/components/ToggleTabs";
import type { WeeklyBriefing } from "@/lib/weekly-briefing";

interface HeroSectionProps {
  feedMode: FeedMode;
  onFeedModeChange: (mode: FeedMode) => void;
  briefing: WeeklyBriefing;
}

export function HeroSection({
  feedMode,
  onFeedModeChange,
  briefing,
}: HeroSectionProps) {
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

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <span className="uppercase tracking-[0.2em]">
              Weekly Briefing
            </span>
            <span className="text-zinc-600">·</span>
            <span>{briefing.weekLabel}</span>
          </div>
          <h1 className="font-serif text-3xl leading-tight text-white sm:text-4xl md:text-[2.75rem]">
            {briefing.headline}
          </h1>
          <p className="text-sm leading-relaxed text-zinc-300 sm:text-[15px] sm:leading-7">
            {briefing.summary}
          </p>
          {briefing.keySignal ? (
            <p className="border-l-2 border-white/20 pl-4 text-sm leading-relaxed text-zinc-400">
              {briefing.keySignal}
            </p>
          ) : null}
        </div>
        <ToggleTabs value={feedMode} onChange={onFeedModeChange} />
      </div>
    </motion.section>
  );
}
