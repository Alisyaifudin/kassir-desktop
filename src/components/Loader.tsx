import { Effect, Either, Fiber, Stream } from "effect";
import { useCallback, useEffect, useRef, useState } from "react";

type Data<T, E> =
  | {
      type: "success";
      data: T;
    }
  | {
      type: "error";
      error: E;
    };

export type Result<T, E> = Data<T, E> | { type: "init" };

type LoaderProps<T, E> = {
  res: Result<T, E>;
  fallback: React.ReactNode;
  children: React.ReactNode | ((props: { data: T }) => React.ReactNode);
};

export function Loader<T, E>({ res, children, fallback = null }: LoaderProps<T, E>) {
  switch (res.type) {
    case "init":
      return fallback;
    case "error":
      throw res.error;
    case "success":
      if (typeof children === "function") return children(res);
      return children;
  }
}

/**
 * Mirrors a hot stream's latest value into React state. Best for multicast
 * sources like `SubscriptionRef.changes`; wrap one-shot effects with
 * `Stream.fromEffect`. The subscription is torn down (fiber interrupted) on
 * unmount.
 */
export function useStream<A, E>(stream: Stream.Stream<A, E, never>): Result<A, E> {
  const [state, setState] = useState<Result<A, E>>({ type: "init" });

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

  const mutate = useCallback(async (input: TInput): Promise<Either.Either<A, E>> => {
    setPending(true);
    setError(null);
    try {
      const either = await Effect.runPromise(runRef.current(input).pipe(Effect.either));
      Either.match(either, {
        onLeft(error) {
          setError(error);
        },
        onRight(data) {
          setData(data);
        },
      });
      return either;
    } finally {
      setPending(false);
    }
  }, []);

  return { pending, error, data, mutate };
}
