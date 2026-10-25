import { Effect, Either, Fiber, Stream } from "effect";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Result } from "~/components/Loader";
import { Held, InlineError } from "./z-Gate";
import { pageCache, type CacheEntry, type CacheKind } from "./z-cache";
import { statusOf, statusOfGroup, type PageDataStatus } from "./z-status";

/**
 * One key of page data. A `Stream` is live: it keeps emitting and every
 * subscriber sees the new value. An `Effect` is read once, and only re-runs when
 * someone calls `refresh` — `Stream.fromEffect` is how it is subscribed either
 * way, so both shapes share one code path, one status, and one cancellation.
 */
export type PageDataSource<A, E = unknown> =
  | Stream.Stream<A, E, never>
  | Effect.Effect<A, E, never>;

export type PageDataSources<TMap, TError = unknown> = {
  [K in keyof TMap]: PageDataSource<TMap[K], TError>;
};

/** The whole page's async state, keyed by exactly the declared map. */
export type PageDataState<TMap, TError = unknown> = {
  [K in keyof TMap]: Result<TMap[K], TError>;
};

/**
 * What a `<pageData.Gate>` needs: the keys its children read, what the region
 * looks like while they are on their way, and what a failure looks like.
 *
 * `data` is `Pick<TMap, K>` — exactly the declared keys, so a body cannot read a
 * key it did not name. That is the whole contract: the gate *is* the read.
 */
export type PageDataGateProps<
  TMap,
  TError = unknown,
  K extends keyof TMap & string = keyof TMap & string,
> = {
  keys: readonly K[];
  /** The placeholder, sized to what it stands in for. Required: no gate without one. */
  pulse: ReactNode;
  /**
   * How long to hold the pulse back — the anti-flash window. `200` for a region
   * whose body is the thing loading; `0` for a value inside a line, where
   * deferring the pulse would put a hole in a sentence.
   */
  delay?: number;
  /** The typed failure slot. Without one, a compact inline error with a retry. */
  error?: ReactNode | ((error: TError) => ReactNode);
  children: (data: Pick<TMap, K>) => ReactNode;
};

/**
 * What a frame (a card's chrome) needs to know: has this set of keys answered,
 * and did anything fail — with **no values**. A card whose frame is
 * data-dependent (a link that only exists while something is owed) reads this;
 * everything inside it gates itself with `<pageData.Gate>`.
 */
export type PageDataFrame<TError = unknown> = {
  status: PageDataStatus;
  error: TError | null;
};

export type PageDataProviderProps<TMap, TError = unknown> = {
  /** Every key the page can read. Subscribed once, all in parallel, on mount. */
  sources: PageDataSources<TMap, TError>;
  /**
   * Values the sources were derived from — a day boundary, an `:id`, a filter.
   * When one changes, every key keeps what it has (`refetching`) and subscribes
   * again, the way a params-driven query would. Compared by string form, so pass
   * primitives and memoize anything that is not one.
   */
  deps?: readonly (string | number | boolean | null | undefined)[];
  children: ReactNode;
};

export type PageDataApi<TMap, TError = unknown> = {
  /** Name passed to `createPageData`, used in error messages. */
  readonly name: string;
  readonly Provider: (props: PageDataProviderProps<TMap, TError>) => ReactNode;
  /** One key. The component re-renders only when that key changes. */
  readonly use: <K extends keyof TMap & string>(key: K) => Result<TMap[K], TError>;
  /** Several keys at once: `success` only once the *last* one has arrived. */
  readonly useAll: <K extends keyof TMap & string>(
    ...keys: K[]
  ) => Result<Pick<TMap, K>, TError>;
  /**
   * The one gate. It takes the keys its children read, so it cannot gate the
   * wrong thing — and the children cannot read a key it did not declare.
   *
   * ```tsx
   * // a body: the region is the thing loading
   * <pageData.Gate keys={["records"]} pulse={<Rows />} error={(e) => <RegionError error={e} />}>
   *   {({ records }) => <Rows records={records} />}
   * </pageData.Gate>
   *
   * // a value inside a line: same component, delay 0, the card owns the error
   * <pageData.Gate keys={["today"]} delay={0} pulse={<SkeletonText className="w-32" />} error={null}>
   *   {({ today }) => today.incoming.total.toLocaleString("id-ID")}
   * </pageData.Gate>
   * ```
   */
  readonly Gate: <K extends keyof TMap & string>(props: PageDataGateProps<TMap, TError, K>) => ReactNode;
  /**
   * The state a frame needs, with no values: the group's word and its first
   * error. Use it for chrome that must outlive a failure (a card frame) and for
   * "should this part be here at all?"; everything that draws a value gates itself.
   */
  readonly useFrame: (keys: readonly (keyof TMap & string)[]) => PageDataFrame<TError>;
  /** One word per key: `pending` / `ready` / `refreshing` / `failed` / `stale`. */
  readonly useStatus: <K extends keyof TMap & string>(key: K) => PageDataStatus;
  /** The entire page state — for a status strip, a debug panel, a header count. */
  readonly useSnapshot: () => PageDataState<TMap, TError>;
  /** Re-runs keys (all of them when called with none). */
  readonly useRefresh: () => (...keys: (keyof TMap & string)[]) => void;
  /**
   * Marks this page's keys owed from **outside** a component — a write that
   * happens on another screen, a shortcut. Mounted pages revalidate at once;
   * unmounted ones find the flag on their next visit.
   *
   * Page-scoped on purpose: a tag named explicitly in `cache.tags` is the shared,
   * cross-page handle (`pageCache.invalidate(tag)`), this is the local one.
   */
  readonly invalidate: (...keys: (keyof TMap & string)[]) => void;
  /**
   * Runs an Effect and, while it is in flight, marks the keys it invalidates
   * `refetching` — the data stays, the component decides what that looks like.
   */
  readonly useMutation: <TInput, A, E>(
    run: (input: TInput) => Effect.Effect<A, E>,
    options?: PageDataMutateOptions<TMap>,
  ) => PageDataMutation<TInput, A, E>;
};

/** Which keys a successful mutation invalidates. */
export type PageDataMutateOptions<TMap> = {
  /**
   * Keys whose data the mutation changes. They keep their last value and carry
   * `refetching: true` for as long as their freshness is in question.
   */
  refetch?: (keyof TMap & string)[];
};

/**
 * How a registry opts into `~/components/page-data/z-cache`.
 *
 * The cache is off unless a page asks for it: it changes *when a read happens*,
 * and a page that has not been thought through on that axis should keep the
 * behaviour it was written against.
 */
export type PageDataCacheOptions = {
  /**
   * Which tag each key files under. Defaults to the page name plus the key, so
   * two pages that happen to both call a key `methods` do not share an entry —
   * they may well mean different shapes by it.
   *
   * Naming a tag explicitly is how a read is *shared*: two pages that name the
   * same tag and the same `deps` read one entry, and `invalidate(tag)` reaches
   * both — that is how a write on one screen refreshes another.
   */
  tags?: Partial<Record<string, string>>;
  /**
   * Keys that must **not** be cached, even though the page opted in.
   *
   * A live key whose *current* value drives a write is the case: `Pos` keeps a
   * cart open by creating one when the draft list is empty, so a stale seeded
   * list could open a cart that no longer exists (or miss one that does). The
   * rest of the page still paints from the store; only this key waits for its
   * own read, exactly as it does today.
   */
  skip?: string[];
  /** Entries kept before the oldest-used is dropped. */
  maxEntries?: number;
};

export type PageDataOptions = {
  /**
   * Keep each key's last answer in a module-level store, so navigating back to a
   * page paints it instead of a skeleton, and only invalidated keys re-read.
   *
   * `true` is the default tag-per-key behaviour; an object overrides the tags.
   */
  cache?: boolean | PageDataCacheOptions;
};

export type PageDataMutation<TInput, A, E> = {
  /** Resolves with an `Either`, exactly like `useMutation` in `Loader.tsx`. */
  mutate: (input: TInput) => Promise<Either.Either<A, E>>;
  /** This mutation's own round-trip. */
  pending: boolean;
  error: E | null;
  data: A | null;
  /**
   * True while any key this mutation invalidates is `refetching`, so it spans
   * the mutation *and* the refetch that follows it.
   */
  refetching: boolean;
  /**
   * True when the write went through but the refetch that follows it **lost**:
   * the keys keep the value they had before the write, and `refetching` is
   * already false. The third outcome between "saved" and "failed", and the one
   * the old `Result` could not say.
   */
  stale: boolean;
};

/** Internal view of the state: keys are strings, data/error are erased. */
type LooseState = Record<string, Result<unknown, unknown>>;

function toStream<A, E>(source: PageDataSource<A, E>): Stream.Stream<A, E, never> {
  return Effect.isEffect(source)
    ? Stream.fromEffect(source as Effect.Effect<A, E, never>)
    : source;
}

/** `Effect` is read once; anything stream-shaped is live. */
function kindOf(source: PageDataSource<unknown, unknown>): CacheKind {
  return Effect.isEffect(source) ? "once" : "live";
}

/** The params a source answers — the half of a cache key that is not the tag. */
function depsSignatureOf(
  deps?: readonly (string | number | boolean | null | undefined)[],
): string {
  return (deps ?? []).map((value) => String(value)).join("\u0000");
}

function initResult(entry: CacheEntry): Result<unknown, unknown> {
  // A seeded value is painted *and* flagged as unconfirmed, because it is: the
  // read that would prove it is the very subscription being started.
  //
  // - `once` entries: only a stale one is flagged. A fresh one is not re-read at
  //   all, so it is confirmed by definition.
  // - `live` entries: always flagged. The subscription has not answered yet, and
  //   a screen that *writes* from the value (Pos creating a cart when the draft
  //   list is empty) can wait for `refetching` to clear — a few milliseconds —
  //   instead of acting on an older visit's list.
  const unconfirmed = entry.stale || entry.kind === "live";
  return unconfirmed
    ? { type: "success", data: entry.data, refetching: true }
    : { type: "success", data: entry.data };
}

/**
 * Declares a page's async data as one keyed registry.
 *
 * ```ts
 * // pages/Product/data.ts
 * export const pageData = createPageData<{
 *   products: Product[];
 *   suppliers: Supplier[];
 * }, ProductError>("ProductPage", { cache: true });
 * ```
 *
 * The page owns the subscriptions (`<pageData.Provider sources={{…}}>`); any
 * descendant reads the slice it needs (`pageData.use("products")`) and decides
 * *locally* what a missing value looks like. Nothing above a `Gate` is blocked
 * by a key it does not read, so static chrome paints on the first frame and only
 * the widgets that truly need data wait for it.
 *
 * Keys are declared in one place and typed everywhere, so a leaf never imports
 * the service, a stream, or a prop chain — only the page's `data.ts`.
 */
export function createPageData<TMap, TError = unknown>(
  name = "PageData",
  options: PageDataOptions = {},
): PageDataApi<TMap, TError> {
  type Key = keyof TMap & string;

  const cacheOptions =
    options.cache === true
      ? {}
      : options.cache === undefined || options.cache === false
        ? null
        : options.cache;
  const cacheOn = cacheOptions !== null;
  const cacheTags: Partial<Record<string, string>> = cacheOptions?.tags ?? {};
  const uncached = new Set<string>(cacheOptions?.skip ?? []);
  /** The store's identity for one key: its tag, else a page-private default. */
  const tagOf = (key: string): string => cacheTags[key] ?? `${name}:${key}`;
  /** Whether this key takes part in the store at all. */
  const isCached = (key: string): boolean => cacheOn && !uncached.has(key);

  if (cacheOptions?.maxEntries !== undefined) pageCache.limit(cacheOptions.maxEntries);

  /** @see PageDataApi.invalidate */
  function invalidate(...keys: Key[]): void {
    if (!cacheOn) return;
    const tags = keys.filter((key) => isCached(key)).map((key) => tagOf(key));
    if (tags.length > 0) pageCache.invalidate(...tags);
  }

  /** Seed one result from the store, counting the hit. */
  function fromCache(key: string, deps: string): Result<unknown, unknown> | undefined {
    if (!isCached(key)) return undefined;
    const entry = pageCache.read(tagOf(key), deps);
    return entry === undefined ? undefined : initResult(entry);
  }

  const Context = createContext<{
    state: LooseState;
    refresh: (...keys: Key[]) => void;
    /** Keeps each key's value and marks it `refetching`. */
    markStale: (keys: Key[]) => void;
    /** Settles a mutation: refetch the one-shot keys when it succeeded. */
    settle: (keys: Key[], succeeded: boolean) => void;
  } | null>(null);

  function Provider({ sources, deps, children }: PageDataProviderProps<TMap, TError>) {
    // The first paint reads the store: with a cache hit the page draws its data
    // instead of a skeleton, which is the whole point of navigating back.
    const [state, setState] = useState<LooseState>(() => {
      const initial: LooseState = {};
      for (const key of Object.keys(sources)) {
        initial[key] = (cacheOn ? fromCache(key, depsSignatureOf(deps)) : undefined) ?? {
          type: "init",
        };
      }
      return initial;
    });

    // Read at subscribe time, never a dependency: a page that passes an inline
    // `sources` object must not resubscribe on every render.
    const sourcesRef = useRef<Record<string, PageDataSource<unknown, unknown>>>(sources);
    sourcesRef.current = sources;

    // One canceller per key, so a refresh restarts exactly one source instead of
    // tearing the whole page's subscriptions down.
    const cancels = useRef(new Map<string, () => void>());

    // The deps the *current* sources answer. `start` reads it at subscribe time,
    // so the entry a read writes is filed under the params it actually used.
    const depsRef = useRef<string>(depsSignatureOf(deps));
    depsRef.current = depsSignatureOf(deps);

    const start = useCallback(
      (key: string) => {
        cancels.current.get(key)?.();

        const source = sourcesRef.current[key];
        if (source === undefined) return;

        const tag = tagOf(key);
        const depsSig = depsRef.current;
        const kind = kindOf(source);

        // A one-shot read that nothing has invalidated is already answered: the
        // store *is* the read, and skipping the query is the entire point. A live
        // source is subscribed either way — it is the truth, not a copy of it.
        if (isCached(key) && kind === "once") {
          const entry = pageCache.peek(tag, depsSig);
          if (entry !== undefined && !entry.stale) {
            setState((old) => {
              const prev = old[key];
              if (prev !== undefined && prev.type === "success" && prev.data === entry.data) {
                return old;
              }
              return { ...old, [key]: { type: "success", data: entry.data } };
            });
            return;
          }
        }

        const fiber = Effect.runFork(
          toStream(source).pipe(
            Stream.runForEach((data) =>
              Effect.sync(() => {
                if (isCached(key)) pageCache.write({ tag, deps: depsSig, kind, data });
                setState((old) => {
                  const prev = old[key];
                  // A `SubscriptionRef` re-emits on every set, even when the value
                  // is equal. Keeping the old result preserves the identity that
                  // downstream memos and `useAll` depend on.
                  if (
                    prev !== undefined &&
                    prev.type === "success" &&
                    prev.data === data &&
                    prev.refetching !== true
                  ) {
                    return old;
                  }
                  return { ...old, [key]: { type: "success", data } };
                });
              }),
            ),
            // A typed error on the stream belongs to this key alone: it lands in
            // this key's state, never in an exception that unmounts the page.
            Effect.catchAll((error) =>
              Effect.sync(() => {
                if (isCached(key)) pageCache.fail(tag, depsSig, error);
                setState((old) => {
                  const prev = old[key];
                  // A value already on screen outlives a failed revalidation: it
                  // is still the last thing we know, and the entry stays owed so
                  // the next mount tries again. `failure` is what makes that
                  // visible instead of silent (`useStatus` reads it as `stale`).
                  if (prev !== undefined && prev.type === "success") {
                    return { ...old, [key]: { ...prev, refetching: undefined, failure: error } };
                  }
                  return { ...old, [key]: { type: "error", error } };
                });
              }),
            ),
          ),
        );

        cancels.current.set(key, () => {
          void Effect.runFork(Fiber.interrupt(fiber));
        });
      },
      [],
    );

    // Only the *set* of keys matters (a page passing an inline `sources` object
    // must not resubscribe on every render), and the dependency signature says
    // when the sources answer a different question. Every key subscribes once,
    // in parallel — no ordering, no waterfall, no `await`.
    const signature = Object.keys(sources).sort().join("\u0000");
    const depsSignature = depsSignatureOf(deps);
    const previousDeps = useRef<string | null>(null);

    const markStale = useCallback((keys: Key[]) => {
      setState((old) => {
        let next = old;
        for (const key of keys) {
          const prev = next[key];
          // A key that never arrived has nothing to keep and a failed one has
          // nothing to offer: only a success turns into `refetching`.
          if (prev === undefined || prev.type !== "success" || prev.refetching === true) continue;
          next = { ...next, [key]: { ...prev, refetching: true } };
        }
        return next;
      });
    }, []);

    /**
     * Paints a new set of params from the store, so going back to a filter you
     * already looked at is as instant as going back to a page.
     */
    const seed = useCallback(
      (keys: string[]) => {
        if (!cacheOn) return;
        const found: [string, Result<unknown, unknown>][] = [];
        for (const key of keys) {
          if (!isCached(key)) continue;
          const result = fromCache(key, depsRef.current);
          if (result !== undefined) found.push([key, result]);
        }
        if (found.length === 0) return;
        setState((old) => {
          const next = { ...old };
          for (const [key, result] of found) next[key] = result;
          return next;
        });
      },
      [],
    );

    useEffect(() => {
      const keys = signature === "" ? [] : signature.split("\u0000");
      const changed = previousDeps.current !== null && previousDeps.current !== depsSignature;
      previousDeps.current = depsSignature;

      // New parameters do not blank the page: when the store already holds the
      // answer for them it is painted straight away, otherwise the previous
      // answers stay on screen, flagged, until the new ones arrive.
      if (changed) {
        // Flag first, then paint: a seeded answer that the store considers fresh
        // must arrive *without* the stale flag the previous params left behind.
        markStale(keys as Key[]);
        seed(keys);
      }
      for (const key of keys) start(key);

      const current = cancels.current;
      return () => {
        for (const cancel of current.values()) cancel();
        current.clear();
      };
    }, [signature, depsSignature, start, markStale, seed]);

    /**
     * Explicit invalidation, delivered to whoever is mounted: a write on another
     * screen must not wait for a remount to be believed.
     */
    useEffect(() => {
      if (!cacheOn) return;
      return pageCache.watch((event) => {
        if (event.type !== "invalidate") return;
        const mine = Object.keys(sourcesRef.current).filter(
          (key) => isCached(key) && event.tags.includes(tagOf(key)),
        );
        if (mine.length === 0) return;
        markStale(mine as Key[]);
        for (const key of mine) start(key);
      });
    }, [start, markStale]);

    const refresh = useCallback(
      (...keys: Key[]) => {
        const available = Object.keys(sourcesRef.current);
        const targets =
          keys.length === 0 ? available : keys.filter((key) => available.includes(key));
        if (targets.length === 0) return;

        for (const key of targets) {
          setState((old) => {
            const prev = old[key];
            // Refreshing keeps what is on screen and flags it stale (`refetching`);
            // only a key with nothing — or with a failure — goes back to `init`.
            return {
              ...old,
              [key]:
                prev !== undefined && prev.type === "success"
                  ? { ...prev, refetching: true }
                  : { type: "init" },
            };
          });
        }

        // With a cache, invalidating is what makes the read happen: the watcher
        // above revalidates this page and any other one holding the tag. A key
        // outside the store (see `skip`) is restarted by hand, as before.
        const cached = targets.filter(isCached);
        if (cached.length > 0) pageCache.invalidate(...cached.map(tagOf));
        for (const key of targets) if (!isCached(key)) start(key);
      },
      [start],
    );

    const settle = useCallback(
      (keys: Key[], succeeded: boolean) => {
        // A successful write invalidates tags, not keys: the watcher turns that
        // into a revalidation here *and* on every other mounted page that reads
        // the same data. Keys outside the store keep the old treatment.
        const cached = succeeded ? keys.filter(isCached) : [];
        if (cached.length > 0) pageCache.invalidate(...cached.map(tagOf));

        for (const key of keys) {
          if (cached.includes(key)) continue;
          const source = sourcesRef.current[key];
          // A read-once source is stale until it answers again, so a successful
          // mutation re-runs it and the flag clears with the new value. A live
          // stream is already the truth the service pushes, so there is nothing
          // to re-run — its flag just clears.
          if (succeeded && source !== undefined && Effect.isEffect(source)) {
            start(key);
            continue;
          }
          setState((old) => {
            const prev = old[key];
            if (prev === undefined || prev.type !== "success" || prev.refetching !== true) {
              return old;
            }
            // Keep the value *and* any older failure: a write that did not change
            // what this read answers is no evidence that the read is healthy.
            return { ...old, [key]: { ...prev, refetching: undefined } };
          });
        }
      },
      [start],
    );

    const value = useMemo(
      () => ({
        state,
        refresh: refresh as (...keys: Key[]) => void,
        markStale: markStale as (keys: Key[]) => void,
        settle: settle as (keys: Key[], succeeded: boolean) => void,
      }),
      [state, refresh, markStale, settle],
    );

    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  /** Resolves the page's state; only usable under its own `Provider`. */
  function useCtx(caller: string) {
    const value = useContext(Context);
    if (value === null) {
      throw new Error(`${caller}() must be called inside <${name}.Provider>.`);
    }
    return value;
  }

  function use<K extends Key>(key: K): Result<TMap[K], TError> {
    const { state } = useCtx(`${name}.use`);
    return (state[key] ?? { type: "init" }) as Result<TMap[K], TError>;
  }

  function useAll<K extends Key>(...keys: K[]): Result<Pick<TMap, K>, TError> {
    const { state } = useCtx(`${name}.useAll`);
    // `keys` is a fresh array on every render; its content is what matters.
    const signature = keys.join("\u0000");

    return useMemo(() => {
      for (const key of keys) {
        const res = state[key];
        if (res === undefined || res.type === "init") return { type: "init" } as const;
        // One failure is enough: holding the error back until the other keys
        // arrive would only delay the bad news.
        if (res.type === "error") {
          return { type: "error", error: res.error as TError } as const;
        }
      }

      const data = {} as Pick<TMap, K>;
      let refetching = false;
      let failure: TError | undefined;
      for (const key of keys) {
        const res = state[key] as {
          type: "success";
          data: TMap[K];
          refetching?: boolean;
          failure?: TError;
        };
        data[key] = res.data;
        if (res.refetching === true) refetching = true;
        if (res.failure !== undefined && failure === undefined) failure = res.failure;
      }

      const base = { type: "success" as const, data };
      if (failure !== undefined) return { ...base, failure };
      return refetching ? { ...base, refetching: true } : base;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state, signature]);
  }

  function useSnapshot(): PageDataState<TMap, TError> {
    return useCtx(`${name}.useSnapshot`).state as PageDataState<TMap, TError>;
  }

  function useStatus<K extends Key>(key: K): PageDataStatus {
    const { state } = useCtx(`${name}.useStatus`);
    return statusOf(state[key]);
  }

  function useFrame(keys: readonly Key[]): PageDataFrame<TError> {
    const { state } = useCtx(`${name}.useFrame`);
    let error: TError | null = null;
    for (const key of keys) {
      const res = state[key];
      if (res !== undefined && res.type === "error") {
        error = res.error as TError;
        break;
      }
    }
    return { status: statusOfGroup(state, keys), error };
  }

  /**
   * The gate. Nothing is thrown and no boundary is involved: this is a plain
   * component deciding between three renders, so `res`-style mismatches cannot
   * happen — the keys it waits on are the keys its children are given.
   */
  function Gate<K extends Key>({
    keys,
    pulse,
    delay = 200,
    error,
    children,
  }: PageDataGateProps<TMap, TError, K>) {
    const { state, refresh } = useCtx(`${name}.Gate`);

    const values = {} as Record<string, unknown>;
    let failed = false;
    let failure: TError | undefined;
    let pending = false;

    for (const key of keys) {
      const res = state[key];
      if (res === undefined || res.type === "init") {
        pending = true;
        continue;
      }
      if (res.type === "error") {
        // Bad news does not wait for a slow key: the first failure is the story.
        if (!failed) failure = res.error as TError;
        failed = true;
        continue;
      }
      values[key] = res.data;
    }

    if (failed) {
      if (typeof error === "function") return <>{error(failure as TError)}</>;
      if (error !== undefined) return <>{error}</>;
      return <InlineError error={failure} onRetry={() => refresh(...keys)} />;
    }

    // A refetch keeps the values, so this branch is only a *first* load.
    if (pending) return <Held delay={delay}>{pulse}</Held>;

    return <>{children(values as Pick<TMap, K>)}</>;
  }

  function useRefresh(): (...keys: Key[]) => void {
    return useCtx(`${name}.useRefresh`).refresh;
  }

  /**
   * A write that invalidates part of the page.
   *
   * The keys named in `refetch` keep the value they already have and are flagged
   * `refetching` from the moment the mutation starts until fresh data lands, so
   * a component can show a dim, a shimmer, a spinner, a “menyegarkan” chip — its
   * call, not the pattern’s. `mutate` resolves with an `Either`, like
   * `useMutation` in `Loader.tsx`.
   *
   * ```ts
   * const save = pageData.useMutation(service.product.set.name, {
   *   refetch: ["products"],
   * });
   * const res = pageData.use("products");
   * const stale = res.type === "success" && res.refetching === true;
   * ```
   */
  function useMutation<TInput, A, E>(
    run: (input: TInput) => Effect.Effect<A, E>,
    options: PageDataMutateOptions<TMap> = {},
  ): PageDataMutation<TInput, A, E> {
    const ctx = useCtx(`${name}.useMutation`);

    // The context value changes with the page state; `mutate` must not.
    const ctxRef = useRef(ctx);
    ctxRef.current = ctx;

    const runRef = useRef(run);
    runRef.current = run;

    const refetch = options.refetch;
    const keysRef = useRef<Key[]>(refetch ?? []);
    keysRef.current = refetch ?? [];

    const [pending, setPending] = useState(false);
    const [error, setError] = useState<E | null>(null);
    const [data, setData] = useState<A | null>(null);

    // Same reasoning as `Loader`'s `useMutation`: the write can outlive the
    // component, and `pending` must stay right for the ones still mounted.
    const mounted = useRef(true);
    const inFlight = useRef(0);
    useEffect(() => {
      mounted.current = true;
      return () => {
        mounted.current = false;
      };
    }, []);

    const mutate = useCallback(async (input: TInput): Promise<Either.Either<A, E>> => {
      const keys = keysRef.current;
      const { markStale, settle } = ctxRef.current;

      inFlight.current += 1;
      if (mounted.current) {
        setPending(true);
        setError(null);
      }
      // Stale from the first instant, not from the answer: the value on screen is
      // already suspect while the write is in flight.
      markStale(keys);

      let settled = false;
      try {
        const either = await Effect.runPromise(runRef.current(input).pipe(Effect.either));
        settled = true;
        settle(keys, Either.isRight(either));

        if (mounted.current) {
          Either.match(either, {
            onLeft: (value) => setError(value),
            onRight: (value) => setData(value),
          });
        }
        return either;
      } catch (defect) {
        // A defect is not a typed failure: nothing is known about the data, so
        // drop the flag instead of leaving the widget stale forever.
        if (!settled) settle(keys, false);
        throw defect;
      } finally {
        inFlight.current -= 1;
        if (mounted.current && inFlight.current === 0) setPending(false);
      }
    }, []);

    // Reads the page state, so it stays true through the refetch that follows
    // the mutation — not just through the mutation itself.
    const refetching = (refetch ?? []).some((key) => {
      const res = ctx.state[key];
      return res !== undefined && res.type === "success" && res.refetching === true;
    });

    // `refetching` is false in both "nothing happened" and "the refetch lost",
    // so the write side could not tell them apart. `statusOf` can: a key that
    // answered, was asked again, and was refused is `stale`, not `ready`.
    const stale = (refetch ?? []).some((key) => statusOf(ctx.state[key]) === "stale");

    return { mutate, pending, error, data, refetching, stale };
  }

  return {
    name,
    Provider,
    use,
    useAll,
    Gate,
    useFrame,
    useStatus,
    useSnapshot,
    useRefresh,
    invalidate,
    useMutation,
  };
}
