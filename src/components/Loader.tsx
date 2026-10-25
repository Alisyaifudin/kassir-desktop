import { Effect, Either, Fiber, Stream } from "effect";
import { useCallback, useEffect, useRef, useState } from "react";

type Data<T, E> =
  | {
      type: "success";
      data: T;
      /** A `keepPrevious` query re-running: `data` is the previous answer. */
      refetching?: boolean;
      /**
       * The last attempt to refresh this value failed, so `data` is from an
       * earlier read. Without it, "kept the old value" and "nothing has ever
       * gone wrong" are the same result — see `pageData.useStatus`.
       */
      failure?: E;
    }
  | {
      type: "error";
      error: E;
    };

export type Result<T, E> = Data<T, E> | { type: "init" };

/**
 * True while a `keepPrevious` query is re-running — the previous value is still
 * on screen, but it is stale. Never true for a first load, which `Loader`'s
 * fallback already covers.
 */
export function isRefetching(res: Result<unknown, unknown>): boolean {
  return res.type === "success" && res.refetching === true;
}

/**
 * Reports `value` only once it has stayed `true` for `delay` ms, the same
 * strobing guard `Loader` uses on its fallback: most queries here resolve in a
 * few milliseconds, and flipping a whole-page busy state for that long reads as
 * a flicker rather than as feedback. Going back to `false` is immediate.
 */
export function useDelayedFlag(value: boolean, delay = 200): boolean {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!value) {
      setShown(false);
      return;
    }
    const timer = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return shown;
}

type LoaderProps<T, E> = {
  res: Result<T, E>;
  fallback?: React.ReactNode;
  children: React.ReactNode | ((props: { data: T }) => React.ReactNode);
  /** How long to stay blank before showing `fallback` while `init`. */
  delay?: number;
};

export function Loader<T, E>({ res, children, fallback = null, delay = 200 }: LoaderProps<T, E>) {
  const [showFallback, setShowFallback] = useState(false);

  // Stay blank briefly so fast loads don't flash the fallback.
  useEffect(() => {
    if (res.type !== "init") {
      setShowFallback(false);
      return;
    }
    const timer = setTimeout(() => setShowFallback(true), delay);
    return () => clearTimeout(timer);
  }, [res.type, delay]);

  switch (res.type) {
    case "init":
      return showFallback ? fallback : null;
    case "error":
      throw res.error;
    case "success":
      if (typeof children === "function") return children(res);
      return children;
  }
}

type DataOf<R> = R extends { type: "success"; data: infer T } ? T : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LoaderManyData<R extends Record<string, Result<any, any>>> = {
  [K in keyof R]: DataOf<R[K]>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LoaderManyProps<R extends Record<string, Result<any, any>>> = {
  res: R;
  fallback?: React.ReactNode;
  children: (data: LoaderManyData<R>) => React.ReactNode;
  /** How long to stay blank before showing `fallback` while any result is `init`. */
  delay?: number;
};

/**
 * Like `Loader`, but for several results at once: waits until every result is
 * `success`, throws the first `error`, and hands the resolved data to
 * `children` keyed by the same names.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function LoaderMany<R extends Record<string, Result<any, any>>>({
  res,
  children,
  fallback = null,
  delay = 200,
}: LoaderManyProps<R>) {
  const results = Object.values(res);
  const isInit = results.some((result) => result.type === "init");

  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (!isInit) {
      setShowFallback(false);
      return;
    }
    const timer = setTimeout(() => setShowFallback(true), delay);
    return () => clearTimeout(timer);
  }, [isInit, delay]);

  for (const result of results) {
    if (result.type === "error") throw result.error;
  }

  if (isInit) return showFallback ? fallback : null;

  const data = Object.fromEntries(
    Object.entries(res).map(([key, result]) => [key, (result as { data: unknown }).data]),
  ) as LoaderManyData<R>;

  return children(data);
}

/**
 * Mirrors a hot stream's latest value into React state. Best for multicast
 * sources like `SubscriptionRef.changes`; wrap one-shot effects with
 * `Stream.fromEffect`. The subscription is torn down (fiber interrupted) on
 * unmount.
 */
export function useStream<A, E>(
  stream: Stream.Stream<A, E, never>,
  initial?: () => A,
): Result<A, E> {
  const [state, setState] = useState<Result<A, E>>(() =>
    initial === undefined ? { type: "init" } : { type: "success", data: initial() },
  );

  // Keep the latest stream without resubscribing on every render.
  const streamRef = useRef(stream);
  streamRef.current = stream;

  useEffect(() => {
    const fiber = Effect.runFork(
      streamRef.current.pipe(
        Stream.runForEach((data) => Effect.sync(() => setState({ type: "success", data }))),
        Effect.catchAll((error) => Effect.sync(() => setState({ type: "error", error }))),
      ),
    );

    return () => {
      void Effect.runFork(Fiber.interrupt(fiber));
    };
  }, []);

  return state;
}

/**
 * Like `useStream`, but re-subscribes whenever `deps` change. Use for
 * param-scoped queries (history, performance, list filters) wrapped in
 * `Stream.fromEffect`.
 *
 * `keepPrevious` holds the last successful value while the new deps resolve.
 * Reach for it when deps change on every keystroke or after a refetch, so the
 * view doesn't blank between queries. While that refetch is in flight the
 * success result carries `refetching: true` (see `isRefetching`), so the view
 * can fade itself instead of passing the stale value off as current.
 */
export function useQuery<A, E>(
  factory: () => Stream.Stream<A, E, never>,
  deps: React.DependencyList,
  options: { initial?: () => A; keepPrevious?: boolean } = {},
): Result<A, E> {
  const { initial, keepPrevious = false } = options;
  const [state, setState] = useState<Result<A, E>>(() =>
    initial === undefined ? { type: "init" } : { type: "success", data: initial() },
  );

  const factoryRef = useRef(factory);
  factoryRef.current = factory;
  const firstRun = useRef(true);

  useEffect(() => {
    if (!keepPrevious) {
      setState(initial === undefined ? { type: "init" } : { type: "success", data: initial() });
    } else if (!firstRun.current) {
      // Deps moved. Keep the previous value, but mark it as no longer current.
      setState((old) => (old.type === "success" ? { ...old, refetching: true } : old));
    }
    firstRun.current = false;

    const fiber = Effect.runFork(
      factoryRef.current().pipe(
        Stream.runForEach((data) => Effect.sync(() => setState({ type: "success", data }))),
        Effect.catchAll((error) => Effect.sync(() => setState({ type: "error", error }))),
      ),
    );

    return () => {
      void Effect.runFork(Fiber.interrupt(fiber));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

/**
 * Runs an Effect on demand (event handlers, submits) and tracks
 * pending/error/data. `mutate` resolves with an `Either` so callers can branch
 * without try/catch; defects still reject the promise.
 */
export function useMutation<TInput, A, E>(run: (input: TInput) => Effect.Effect<A, E>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<E | null>(null);
  const [data, setData] = useState<A | null>(null);

  // Keep the latest `run` without making `mutate` unstable.
  const runRef = useRef(run);
  runRef.current = run;

  // A mutation can outlive its component (a dialog that closes while saving).
  // Setting state after unmount is a no-op in React 19 but the pending counter
  // must still be right for the components that *are* mounted, so it is tracked
  // per call and only written while mounted.
  const mounted = useRef(true);
  const inFlight = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const mutate = useCallback(async (input: TInput): Promise<Either.Either<A, E>> => {
    inFlight.current += 1;
    if (mounted.current) {
      setPending(true);
      setError(null);
    }
    try {
      const either = await Effect.runPromise(runRef.current(input).pipe(Effect.either));
      if (mounted.current) {
        Either.match(either, {
          onLeft(error) {
            setError(error);
          },
          onRight(data) {
            setData(data);
          },
        });
      }
      return either;
    } finally {
      inFlight.current -= 1;
      // `pending` is false only once *every* in-flight call has settled.
      if (mounted.current && inFlight.current === 0) setPending(false);
    }
  }, []);

  return { pending, error, data, mutate };
}
