interface FeedStatusProps {
  error?: string | null;
  stale?: boolean;
}

export function FeedStatus({ error, stale }: FeedStatusProps) {
  if (!error && !stale) return null;

  return (
    <div
      className="rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-400"
      role="status"
    >
      {error && (
        <p>
          <span className="text-zinc-200">Live feed unavailable.</span> {error}
          {stale && " Showing the last cached briefing."}
        </p>
      )}
      {!error && stale && (
        <p className="text-zinc-300">Showing cached briefing while refreshing.</p>
      )}
    </div>
  );
}
