import { Effect, Either, pipe } from "effect";
import { useCallback, useState } from "react";

export function useCallEffect<TInput, A, E>(cb: (input: TInput) => Effect.Effect<A, E>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<E | null>(null);
  const [data, setData] = useState<A | null>(null);
  const handler = useCallback(
    async (input: TInput) => {
      setLoading(true);
      const res = await Effect.runPromise(pipe(cb(input), Effect.either));
      Either.match(res, {
        onLeft(left) {
          setError(left);
          setData(null);
        },
        onRight(right) {
          setError(null);
          setData(right);
        },
      });
      setLoading(false);
    },
    [cb],
  );
  return { loading, error, data, handler };
}
