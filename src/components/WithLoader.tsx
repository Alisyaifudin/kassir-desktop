import { Effect, Either, pipe } from "effect";
import { useEffect, useSyncExternalStore } from "react";

type Props<T, E = never> = {
  loader: Loader<T, E>;
  loading?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
};

type Data<T, E> =
  | {
      state: "init";
    }
  | {
      state: "error";
      error: E;
    }
  | {
      state: "loading";
      data: T;
    }
  | {
      state: "idle";
      data: T;
    };

type Listener = () => void;

class Loader<T, E = never> {
  private data: Data<T, E> = { state: "init" };
  private listeners = new Set<Listener>();

  constructor(private effect: Effect.Effect<T, E>) {}

  async run() {
    return Effect.runPromise(pipe(this.effect, Effect.either));
  }

  getData() {
    return this.data;
  }

  setData(data: Data<T, E>) {
    this.data = data;
    this.listeners.forEach((l) => l());
  }

  refetch() {
    const current = this.getData();
    if ("data" in current) {
      this.setData({ state: "loading", data: current.data });
    }
    this.run().then((either) => {
      Either.match(either, {
        onLeft: (error) => this.setData({ state: "error", error }),
        onRight: (data) => this.setData({ state: "idle", data }),
      });
    });
  }

  cleanup() {
    this.listeners.clear();
  }

  private subscribe(cb: Listener) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private getSnapshot() {
    return this.data;
  }

  useDataState() {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useSyncExternalStore(this.subscribe, this.getSnapshot);
  }

  use() {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const data = useSyncExternalStore(this.subscribe, this.getSnapshot);
    if ("data" in data) {
      return data;
    }
    throw new Error(
      "loader.use() was called before data was available. Wrap your component with <WithLoader> to ensure data is loaded first.",
    );
  }
}

export function WithLoader<T, E = never>({
  error,
  loader,
  children,
  loading: fallback,
}: Props<T, E>) {
  const data = loader.useDataState();

  useEffect(() => {
    async function init() {
      const either = await loader.run();
      Either.match(either, {
        onLeft(error) {
          loader.setData({ state: "error", error });
        },
        onRight(data) {
          loader.setData({ state: "idle", data });
        },
      });
    }
    init();
  }, [loader]);

  // Cleanup on unmount or when loader changes
  useEffect(() => {
    return () => {
      loader.cleanup();
    };
  }, [loader]);

  if (data.state === "init") {
    return fallback ?? null;
  }
  if (data.state === "error") {
    return error ?? null;
  }
  return children;
}

/**
// example

const loader = new Loader(Effect.succeed(0));

function Child({ loader }: { loader: Loader<number> }) {
  const { data } = loader.use();
  return <p>uwu {data}</p>;
}

function Parent() {
  return (
    <WithLoader loader={loader}>
      <Child loader={loader} />
    </WithLoader>
  );
}
 */
