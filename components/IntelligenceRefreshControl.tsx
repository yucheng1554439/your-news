"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { refreshIntelligenceAction } from "@/app/actions/refresh-intelligence";

interface IntelligenceRefreshControlProps {
  lastUpdated: number | null;
  storiesFetchedAt?: number;
  hasSnapshot?: boolean;
  persistenceConfigured?: boolean;
  isRefreshing?: boolean;
  onRefreshingChange?: (refreshing: boolean) => void;
  className?: string;
}

function formatTimestamp(ms: number | null): string {
  if (!ms) return "Not generated yet";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ms));
}

export function IntelligenceRefreshControl({
  lastUpdated,
  storiesFetchedAt,
  hasSnapshot = false,
  persistenceConfigured = false,
  isRefreshing = false,
  onRefreshingChange,
  className = "",
}: IntelligenceRefreshControlProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [localRefreshing, setLocalRefreshing] = useState(false);

  const refreshing = isRefreshing || localRefreshing;
  const displayUpdated = lastUpdated ?? storiesFetchedAt ?? null;

  async function handleRefresh() {
    if (refreshing || !persistenceConfigured) return;
    setError(null);
    setLocalRefreshing(true);
    onRefreshingChange?.(true);

    try {
      const result = await refreshIntelligenceAction();
      if (!result.ok) {
        setError(result.error ?? "Refresh failed");
        return;
      }
      router.refresh();
    } finally {
      setLocalRefreshing(false);
      onRefreshingChange?.(false);
    }
  }

  return (
    <div className={`flex flex-col items-start gap-3 sm:items-end ${className}`}>
      <div className="text-right text-xs text-zinc-500">
        <p>
          <span className="text-zinc-600">Last updated · </span>
          {formatTimestamp(displayUpdated)}
        </p>
        {!persistenceConfigured && (
          <p className="mt-1 max-w-xs text-right text-amber-500/90">
            Redis/KV not configured — add Upstash or Vercel KV env vars. Check{" "}
            <a
              href="/api/persistence/health"
              className="underline hover:text-amber-400"
            >
              /api/persistence/health
            </a>
          </p>
        )}
        {persistenceConfigured && !hasSnapshot && !refreshing && (
          <p className="mt-1 text-zinc-600">
            Snapshot not built — refresh to generate intelligence
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => void handleRefresh()}
        disabled={!persistenceConfigured}
        className="inline-flex min-w-[11rem] items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-zinc-200 transition hover:border-white/25 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {refreshing ? (
          <>
            <span
              className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white"
              aria-hidden
            />
            Refreshing…
          </>
        ) : (
          "Refresh Intelligence"
        )}
      </button>

      {error ? (
        <p className="max-w-xs text-right text-xs text-red-400/90">{error}</p>
      ) : null}
    </div>
  );
}
