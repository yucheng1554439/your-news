import "server-only";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export type MemoryStoreOptions = {
  /** Time-to-live in milliseconds. */
  ttlMs: number;
  /** Max entries before oldest are evicted (serverless-safe bound). */
  maxEntries?: number;
};

/**
 * Process-local TTL cache. Safe for Vercel serverless (no filesystem).
 * Persists only for the lifetime of a warm function instance.
 */
export function createMemoryStore<T>(options: MemoryStoreOptions) {
  const store = new Map<string, CacheEntry<T>>();
  const maxEntries = options.maxEntries ?? 400;

  function evictIfNeeded(): void {
    if (store.size <= maxEntries) return;
    const overflow = store.size - maxEntries;
    const keys = store.keys();
    for (let i = 0; i < overflow; i++) {
      const next = keys.next();
      if (next.done) break;
      store.delete(next.value);
    }
  }

  return {
    get(key: string): T | null {
      const entry = store.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },

    set(key: string, value: T): void {
      store.set(key, {
        value,
        expiresAt: Date.now() + options.ttlMs,
      });
      evictIfNeeded();
    },

    delete(key: string): void {
      store.delete(key);
    },

    clear(): void {
      store.clear();
    },
  };
}
