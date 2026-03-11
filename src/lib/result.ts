import { Effect, Either, pipe } from "effect";
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

type ResultType<T, E> =
  | { type: "pending" }
  | { type: "error"; error: E }
  | { type: "success"; data: T };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Query<T = any, E = any> = {
  result: ResultType<T, E>;
  setVersion: Dispatch<SetStateAction<number>>;
  revalidate: () => Promise<ResultType<T, E>>;
};

const cache: Map<string, Query> = new Map();

async function run<T, E>(
  fn: () => Effect.Effect<T, E>,
): Promise<{ type: "error"; error: E } | { type: "success"; data: T }> {
  const res = await Effect.runPromise(pipe(fn(), Effect.either));
  return Either.match(res, {
    onLeft(error) {
      return { type: "error", error };
    },
    onRight(value) {
      return { type: "success", data: value };
    },
  });
}

export const Result = {
  use<T, E = never>({
    fn,
    key,
    revalidateOn = {
      unmount: false,
    },
    deps = [],
  }: {
    readonly key?: string;
    fn: () => Effect.Effect<T, E>;
    revalidateOn?: {
      unmount?: boolean;
    };
    deps?: React.DependencyList;
  }) {
    const [, setVersion] = useState(0);
    const fnRef = useRef(fn);
    fnRef.current = fn;
    key ??= window.location.pathname;
    const query = useMemo(() => {
      let q = cache.get(key) as Query<T, E> | undefined;
      if (q === undefined) {
        q = {
          result: { type: "pending" },
          setVersion,
          revalidate: () => run(() => fnRef.current()),
        };
        cache.set(key, q as Query<unknown, unknown>);
      }
      return q;
    }, [key]);

    useEffect(() => {
      if (query.result.type === "pending") return;

      let cancelled = false;
      run(() => fnRef.current()).then((result) => {
        if (cancelled) return;
        query.result = result;
        setVersion((v) => v + 1);
      });
    }, deps);

    useEffect(() => {
      if (query.result.type !== "pending") return;

      let cancelled = false;

      run(() => fnRef.current()).then((result) => {
        if (cancelled) return;
        query.result = result;
        setVersion((v) => v + 1);
      });

      return () => {
        cancelled = true;
        if (revalidateOn.unmount) cache.delete(key);
      };
    }, [key, query]);

    return query.result;
  },
  match<T, E = never>(
    res: ResultType<T, E>,
    {
      onSuccess,
      onError,
      onLoading,
    }: {
      onSuccess?: (value: T) => React.ReactNode;
      onLoading?: () => React.ReactNode;
      onError?: (error: E) => React.ReactNode;
    },
  ) {
    switch (res.type) {
      case "pending":
        return onLoading?.() ?? null;
      case "error":
        return onError?.(res.error) ?? null;
      case "success":
        return onSuccess?.(res.data) ?? null;
    }
  },
  async revalidate(key?: string) {
    if (key === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const promises: [string, Query, Promise<ResultType<any, any>>][] = [];
      for (const [key, query] of cache.entries()) {
        promises.push([key, query, query.revalidate()]);
      }
      const all = await Promise.all(promises.map((p) => p[2]));
      promises.forEach(([key, query], i) => {
        query.result = all[i];
        cache.set(key, query);
        query.setVersion((v) => v + 1);
      });
    } else {
      const query = cache.get(key);
      if (query === undefined) return;
      const res = await query.revalidate();
      query.result = res;
      cache.set(key, query);
      query.setVersion((v) => v + 1);
    }
  },
};
