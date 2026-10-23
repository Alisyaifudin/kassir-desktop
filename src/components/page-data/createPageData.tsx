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
  /** The entire page state — for a status strip, a debug panel, a header count. */
  readonly useSnapshot: () => PageDataState<TMap, TError>;
  /** Re-runs keys (all of them when called with none). */
  readonly useRefresh: () => (...keys: (keyof TMap & string)[]) => void;
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
};

/** Internal view of the state: keys are strings, data/error are erased. */
type LooseState = Record<string, Result<unknown, unknown>>;

function toStream<A, E>(source: PageDataSource<A, E>): Stream.Stream<A, E, never> {
  return Effect.isEffect(source)
    ? Stream.fromEffect(source as Effect.Effect<A, E, never>)
    : source;
}

function initState<TMap, TError>(sources: PageDataSources<TMap, TError>): LooseState {
  const state: LooseState = {};
  for (const key of Object.keys(sources)) state[key] = { type: "init" };
  return state;
}

/**
 * Declares a page's async data as one keyed registry.
 *
 * ```ts
 * // pages/Product/data.ts
 * export const pageData = createPageData<{
 *   products: Product[];
 *   suppliers: Supplier[];
 * }, ProductError>("ProductPage");
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
): PageDataApi<TMap, TError> {
  type Key = keyof TMap & string;

  const Context = createContext<{
    state: LooseState;
    refresh: (...keys: Key[]) => void;
    /** Keeps each key's value and marks it `refetching`. */
    markStale: (keys: Key[]) => void;
    /** Settles a mutation: refetch the one-shot keys when it succeeded. */
    settle: (keys: Key[], succeeded: boolean) => void;
  } | null>(null);

  function Provider({ sources, deps, children }: PageDataProviderProps<TMap, TError>) {
    const [state, setState] = useState<LooseState>(() => initState(sources));

    // Read at subscribe time, never a dependency: a page that passes an inline
    // `sources` object must not resubscribe on every render.
    const sourcesRef = useRef<Record<string, PageDataSource<unknown, unknown>>>(sources);
    sourcesRef.current = sources;

    // One canceller per key, so a refresh restarts exactly one source instead of
    // tearing the whole page's subscriptions down.
    const cancels = useRef(new Map<string, () => void>());

    const start = useCallback((key: string) => {
      cancels.current.get(key)?.();

      const source = sourcesRef.current[key];
      if (source === undefined) return;

      const fiber = Effect.runFork(
        toStream(source).pipe(
          Stream.runForEach((data) =>
            Effect.sync(() =>
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
              }),
            ),
          ),
          // A typed error on the stream belongs to this key alone: it lands in
          // this key's state, never in an exception that unmounts the page.
          Effect.catchAll((error) =>
            Effect.sync(() => setState((old) => ({ ...old, [key]: { type: "error", error } }))),
          ),
        ),
      );

      cancels.current.set(key, () => {
        void Effect.runFork(Fiber.interrupt(fiber));
      });
    }, []);

    // Only the *set* of keys matters (a page passing an inline `sources` object
    // must not resubscribe on every render), and the dependency signature says
    // when the sources answer a different question. Every key subscribes once,
    // in parallel — no ordering, no waterfall, no `await`.
    const signature = Object.keys(sources).sort().join("\u0000");
    const depsSignature = (deps ?? []).map((value) => String(value)).join("\u0000");
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

    useEffect(() => {
      const keys = signature === "" ? [] : signature.split("\u0000");
      const changed = previousDeps.current !== null && previousDeps.current !== depsSignature;
      previousDeps.current = depsSignature;

      // New parameters do not blank the page: the previous answers stay on
      // screen, flagged, until the new ones arrive.
      if (changed) markStale(keys as Key[]);
      for (const key of keys) start(key);

      const current = cancels.current;
      return () => {
        for (const cancel of current.values()) cancel();
        current.clear();
      };
    }, [signature, depsSignature, start, markStale]);

    const refresh = useCallback((...keys: Key[]) => {
      const available = Object.keys(sourcesRef.current);
      const targets = keys.length === 0 ? available : keys.filter((key) => available.includes(key));

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
        start(key);
      }
    }, [start]);

    const settle = useCallback(
      (keys: Key[], succeeded: boolean) => {
        for (const key of keys) {
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
            return { ...old, [key]: { type: "success", data: prev.data } };
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
      for (const key of keys) {
        const res = state[key] as { type: "success"; data: TMap[K]; refetching?: boolean };
        data[key] = res.data;
        if (res.refetching === true) refetching = true;
      }

      return refetching
        ? ({ type: "success", data, refetching: true } as const)
        : ({ type: "success", data } as const);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state, signature]);
  }

  function useSnapshot(): PageDataState<TMap, TError> {
    return useCtx(`${name}.useSnapshot`).state as PageDataState<TMap, TError>;
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

    return { mutate, pending, error, data, refetching };
  }

  return { name, Provider, use, useAll, useSnapshot, useRefresh, useMutation };
}
