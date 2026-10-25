/**
 * The page-data cache: the last answer each key gave, kept outside React so a
 * route change does not throw it away.
 *
 * Three rules, and everything below follows from them:
 *
 * 1. **Memory only.** The store lives as long as the webview. A reload starts
 *    cold — no schema to version, nothing on disk to go wrong.
 * 2. **Paint first, revalidate after.** A cached answer is drawn on the first
 *    frame, never a skeleton. Whether it is then re-read depends on rule 3.
 * 3. **Trusted until something says it moved.** There is no TTL: a value stays
 *    fresh until a write invalidates its tag (a mutation names its keys, a
 *    service bumps a revision) or someone calls `invalidate` by hand. A timer
 *    would refetch data nobody changed, which is the cost this cache exists to
 *    remove.
 *
 * Entries are filed under `tag + deps`: the tag is the *identity* of the read
 * ("products"), the deps signature is the *question* it answered ("2025-01-01…
 * 2025-01-02…|ko"). Two pages that read the same tag with the same deps share
 * one entry; the same tag under a different filter is a different answer.
 */

/** A live subscription (`Stream`) or a one-shot read (`Effect`). */
export type CacheKind = "live" | "once";

export type CacheEntry = {
  readonly tag: string;
  /** The params signature the answer belongs to. */
  readonly deps: string;
  kind: CacheKind;
  data: unknown;
  /** An invalidation landed and no read has confirmed the value since. */
  stale: boolean;
  /** When the value was last confirmed — by a read or a live emission. */
  at: number;
  /** When it was last painted or written; the eviction order. */
  usedAt: number;
  /** Mounts that painted it without a skeleton. */
  hits: number;
  /** The last failed revalidation, if the value on screen outlived it. */
  error: unknown;
};

export type CacheEvent =
  | { type: "invalidate"; tags: readonly string[] }
  | { type: "clear" };

export type CacheStats = {
  /** Mounts served from the store instead of a read. */
  hits: number;
  /** Lookups that had to consult the source. */
  misses: number;
  /** Values written back by a read or a live emission. */
  writes: number;
  /** Entries an `invalidate` marked stale. */
  invalidations: number;
  /** Entries dropped to stay under the cap. */
  evictions: number;
};

export type CacheSnapshot = {
  entries: readonly CacheEntry[];
  stats: Readonly<CacheStats>;
  maxEntries: number;
};

/** Enough for every page a session visits, small enough to stay a rounding error. */
export const DEFAULT_MAX_ENTRIES = 200;

const store = new Map<string, CacheEntry>();
const listeners = new Set<(event: CacheEvent) => void>();

const stats: CacheStats = {
  hits: 0,
  misses: 0,
  writes: 0,
  invalidations: 0,
  evictions: 0,
};

let maxEntries = DEFAULT_MAX_ENTRIES;

const keyOf = (tag: string, deps: string): string => `${tag}\u0000${deps}`;

function notify(event: CacheEvent): void {
  for (const listener of listeners) listener(event);
}

function evict(): void {
  while (store.size > maxEntries) {
    let oldestKey: string | null = null;
    let oldestUsed = Number.POSITIVE_INFINITY;
    for (const [key, entry] of store) {
      if (entry.usedAt < oldestUsed) {
        oldestUsed = entry.usedAt;
        oldestKey = key;
      }
    }
    if (oldestKey === null) return;
    store.delete(oldestKey);
    stats.evictions += 1;
  }
}

/**
 * The store every cache-enabled `createPageData` registry reads and writes.
 *
 * It is deliberately a plain module singleton: the whole point is to outlive the
 * component that filled it, and a React context would die with the route.
 */
export const pageCache = {
  /**
   * The entry for this question, **counting a hit** — use it when the value is
   * about to be painted. Returns `undefined` (and counts a miss) otherwise.
   */
  read(tag: string, deps: string): CacheEntry | undefined {
    const entry = store.get(keyOf(tag, deps));
    if (entry === undefined) {
      stats.misses += 1;
      return undefined;
    }
    entry.hits += 1;
    entry.usedAt = Date.now();
    stats.hits += 1;
    return entry;
  },

  /** The entry without touching the counters — for an inspector, or a peek. */
  peek(tag: string, deps: string): CacheEntry | undefined {
    return store.get(keyOf(tag, deps));
  },

  /** Records a value a read or a live emission just produced. */
  write(input: { tag: string; deps: string; kind: CacheKind; data: unknown }): CacheEntry {
    const key = keyOf(input.tag, input.deps);
    const now = Date.now();
    const existing = store.get(key);

    if (existing !== undefined) {
      existing.data = input.data;
      existing.kind = input.kind;
      existing.stale = false;
      existing.error = null;
      existing.at = now;
      existing.usedAt = now;
      stats.writes += 1;
      return existing;
    }

    const entry: CacheEntry = {
      tag: input.tag,
      deps: input.deps,
      kind: input.kind,
      data: input.data,
      stale: false,
      at: now,
      usedAt: now,
      hits: 0,
      error: null,
    };
    store.set(key, entry);
    stats.writes += 1;
    evict();
    return entry;
  },

  /**
   * A revalidation failed. The value stays — it is still the last thing we know —
   * but it goes back to being owed, so the next mount tries again instead of
   * showing a failure the operator cannot act on.
   */
  fail(tag: string, deps: string, error: unknown): void {
    const entry = store.get(keyOf(tag, deps));
    if (entry === undefined) return;
    entry.stale = true;
    entry.error = error;
  },

  /**
   * Marks every entry under these tags owed. Mounted pages hear it and revalidate
   * at once; unmounted ones find the flag on their next mount.
   */
  invalidate(...tags: string[]): number {
    const wanted = new Set(tags);
    let count = 0;
    for (const entry of store.values()) {
      if (!wanted.has(entry.tag) || entry.stale) continue;
      entry.stale = true;
      count += 1;
    }
    stats.invalidations += count;
    if (tags.length > 0) notify({ type: "invalidate", tags });
    return count;
  },

  /** Forgets everything. Mounted pages keep what they are showing. */
  clear(): void {
    store.clear();
    notify({ type: "clear" });
  },

  /** Wipes the store *and* the counters — what a test needs before it starts. */
  reset(): void {
    store.clear();
    stats.hits = 0;
    stats.misses = 0;
    stats.writes = 0;
    stats.invalidations = 0;
    stats.evictions = 0;
    maxEntries = DEFAULT_MAX_ENTRIES;
    notify({ type: "clear" });
  },

  /** Caps the store; the oldest-used entry is dropped first. */
  limit(entries: number): void {
    maxEntries = Math.max(1, entries);
    evict();
  },

  snapshot(): CacheSnapshot {
    return {
      entries: [...store.values()].sort((a, b) => b.usedAt - a.usedAt),
      stats: { ...stats },
      maxEntries,
    };
  },

  /** Fires on `invalidate` and `clear`. Returns the unsubscribe. */
  watch(listener: (event: CacheEvent) => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
