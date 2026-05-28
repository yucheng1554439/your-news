interface FeedStatusProps {
  error?: string | null;
  stale?: boolean;
  liveDelayed?: boolean;
  cacheStatus?: "fresh" | "stale" | "empty";
  fromPersistentStore?: boolean;
}

export function FeedStatus({
  error,
  stale,
  fromPersistentStore,
}: FeedStatusProps) {
  if (!error && !stale) return null;

  return (
    <div
      className="rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-400"
      role="status"
    >
      {stale && !error && (
        <p className="text-zinc-300">
          Serving your saved intelligence snapshot.
          {fromPersistentStore && " Loaded from persistent store."}
          {" "}Use Refresh Intelligence to fetch new headlines.
        </p>
      )}
      {error && (
        <p className="text-zinc-300">
          <span className="text-zinc-100">Headlines unavailable.</span> {error}
          {stale && " Showing the last cached snapshot."}
        </p>
      )}
    </div>
  );
}
