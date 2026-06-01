"use client";

import { useMemo } from "react";
import { computeSignalsDashboard } from "@/lib/signals/momentum";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import type { OnboardingProfile, Story } from "@/lib/types";
import { cn } from "@/lib/utils";

type SignalsDashboardProps = {
  stories: Story[];
  profile: OnboardingProfile | null;
  userIntelligence?: UserIntelligenceProfile | null;
  personalized?: boolean;
  className?: string;
};

function SignalColumn({
  title,
  direction,
  items,
  variant,
}: {
  title: string;
  direction: "rising" | "falling";
  items: { id: string; label: string; momentum: number; sourceCount: number }[];
  variant: "rising" | "falling";
}) {
  const icon = direction === "rising" ? "↑" : "↓";
  const accent =
    variant === "rising" ? "text-emerald-400/90" : "text-amber-400/90";

  return (
    <div className="min-w-0 flex-1 space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-600">No clear shift this period.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((row) => (
            <li
              key={row.id}
              className="flex items-start justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0"
            >
              <span className="flex min-w-0 items-baseline gap-2 text-sm text-zinc-200">
                <span className={cn("shrink-0 font-medium tabular-nums", accent)}>
                  {icon}
                </span>
                <span className="truncate">{row.label}</span>
              </span>
              <span className="shrink-0 text-[10px] tabular-nums text-zinc-600">
                {row.sourceCount} src
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SignalsDashboard({
  stories,
  profile,
  userIntelligence = null,
  personalized = false,
  className,
}: SignalsDashboardProps) {
  const model = useMemo(
    () =>
      computeSignalsDashboard(
        stories,
        profile,
        userIntelligence,
        personalized
      ),
    [stories, profile, userIntelligence, personalized]
  );

  if (stories.length < 4) return null;

  return (
    <section
      className={cn(
        "rounded-xl border border-white/10 bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-neutral-950 px-5 py-5 sm:px-6 sm:py-6",
        className
      )}
      aria-label="Signals dashboard"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-500">
            Intelligence desk
          </p>
          <h2 className="mt-1 font-serif text-xl text-white sm:text-2xl">
            Signal Momentum
          </h2>
        </div>
        <p className="text-xs text-zinc-500 sm:max-w-xs sm:text-right">
          {model.lensLabel}
        </p>
      </div>

      <p className="mt-2 text-sm text-zinc-400">
        What is gaining versus losing attention in the feed — by story volume,
        source breadth, importance, clustering, and recency
        {personalized ? ", weighted to your reading behavior" : ""}.
      </p>

      <div className="mt-6 grid gap-8 border-t border-white/10 pt-6 sm:grid-cols-2">
        <SignalColumn
          title="Signals rising"
          direction="rising"
          variant="rising"
          items={model.rising}
        />
        <SignalColumn
          title="Signals falling"
          direction="falling"
          variant="falling"
          items={model.falling}
        />
      </div>
    </section>
  );
}
