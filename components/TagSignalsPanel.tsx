"use client";

import { useMemo } from "react";
import { aggregateTagSignals } from "@/lib/intelligence/story-tags";
import type { Story } from "@/lib/types";

type TagSignalsPanelProps = {
  stories: Story[];
  className?: string;
};

/** Theme-level signals across the current feed — multi-tag intelligence view. */
export function TagSignalsPanel({ stories, className }: TagSignalsPanelProps) {
  const signals = useMemo(
    () => aggregateTagSignals(stories, 10),
    [stories]
  );

  if (signals.length === 0) return null;

  return (
    <section
      className={className}
      aria-label="Active themes in your feed"
    >
      <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        Active themes
      </h2>
      <p className="mt-1 text-sm text-zinc-400">
        Stories are tagged across domains — not locked to one section.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {signals.map((row) => (
          <span
            key={`${row.kind}-${row.tag}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300"
          >
            <span>{row.label}</span>
            <span className="text-zinc-500">{row.count}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
