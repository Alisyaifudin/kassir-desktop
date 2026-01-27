import { Effect, Either } from "effect";
import { useSyncExternalStore } from "react";

type Listener = () => void;

type Query<A, E> = {
  read(): Either.Either<A, E>;
  revalidate(): void;
  subscribe(listener: Listener): () => void;
  getSnapshot(): number;
};

function createQuery<A, E>(effectFn: () => Effect.Effect<A, E>): Query<A, E> {
  let status: "pending" | "done" = "pending";
  let value: Either.Either<A, E>;
  let promise: Promise<void>;
  let version = 0;

  const listeners = new Set<Listener>();

  const notify = () => {
    version++;
    for (const l of listeners) l();
  };

  const run = () => {
    status = "pending";
    notify(); // 🔥 version changes → Suspense

    promise = Effect.runPromise(Effect.either(effectFn())).then((v) => {
      value = v;
      status = "done";
      notify(); // 🔥 version changes → re-render
    });
  };

  run();

  return {
    read() {
      if (status === "pending") {
        throw promise;
      }
      return value!;
    },

    revalidate() {
      run();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    getSnapshot() {
      return version;
    },
  };
}

const queryCache = new Map<string, Query<any, any>>();

type UseMicroOptions<A, E> = {
  key: string;
  fn: () => Effect.Effect<A, E>;
};

export function useMicro<A, E = never>(options: UseMicroOptions<A, E>): Either.Either<A, E> {
  let query = queryCache.get(options.key);

  if (!query) {
    query = createQuery(options.fn);
    queryCache.set(options.key, query);
  }
  useSyncExternalStore(query.subscribe, query.getSnapshot);

  return query.read();
}

export function revalidate(key?: string) {
  if (key) {
    queryCache.get(key)?.revalidate();
  } else {
    for (const q of queryCache.values()) {
      q.revalidate();
    }
  }
}
