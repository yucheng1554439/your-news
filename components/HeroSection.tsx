"use client";

import { motion } from "framer-motion";
import { BriefingMemo } from "@/components/BriefingMemo";
import { BriefingProvenance } from "@/components/BriefingProvenance";
import { IntelligenceRefreshControl } from "@/components/IntelligenceRefreshControl";
import { ToggleTabs, type FeedMode } from "@/components/ToggleTabs";
import { resolveBriefingDateDisplay } from "@/lib/briefing/shared/briefing-dates";
import { briefingMetaColor, briefingSectionLabelColor } from "@/components/BriefingMemo";
import { intelligenceModeLabel } from "@/lib/briefing/shared/labels";
import { formatBriefingForDisplay } from "@/lib/briefing/shared/display";
import type { IntelligenceBriefing } from "@/lib/briefing/types";

interface HeroSectionProps {
  feedMode: FeedMode;
  onFeedModeChange: (mode: FeedMode) => void;
  briefing: IntelligenceBriefing;
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
  const displayBody = formatBriefingForDisplay(briefing);
  const provenance = briefing.provenance;
  const storiesProcessed =
    provenance?.storiesProcessed ?? provenance?.articleCount ?? 0;
  const sourcesProcessed =
    provenance?.sourcesProcessed ?? provenance?.sourceCount ?? 0;
  const dateDisplay = resolveBriefingDateDisplay(
    briefing,
    lastUpdated ?? storiesFetchedAt ?? null
  );

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
          <div
            className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em]"
            style={{ color: briefingSectionLabelColor }}
          >
            <span>{intelligenceModeLabel(briefing.mode)}</span>
            {dateDisplay.coverageLine ? (
              <>
                <span style={{ color: briefingMetaColor }}>·</span>
                <span style={{ color: briefingMetaColor }}>
                  {dateDisplay.coverageLine}
                </span>
              </>
            ) : null}
          </div>

          <div
            className="flex flex-wrap gap-x-4 gap-y-1 text-xs"
            style={{ color: briefingMetaColor }}
          >
            {dateDisplay.lastUpdatedLine ? (
              <span>{dateDisplay.lastUpdatedLine}</span>
            ) : null}
            {storiesProcessed > 0 ? (
              <span>{storiesProcessed} stories processed</span>
            ) : null}
            {sourcesProcessed > 0 ? (
              <span>{sourcesProcessed} sources processed</span>
            ) : null}
          </div>

          <motion.h1
            key={`${animationKey}-headline`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="font-serif text-2xl leading-snug tracking-tight text-white text-balance sm:text-3xl md:text-[2.125rem] md:leading-[1.2]"
          >
            {briefing.headline}
          </motion.h1>
          <BriefingMemo key={animationKey} text={displayBody} />
          {briefing.provenance ? (
            <BriefingProvenance provenance={briefing.provenance} />
          ) : null}
        </div>
        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:items-end">
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
