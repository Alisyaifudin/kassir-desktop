import { Effect, Either, pipe } from "effect";
import { useEffect, useState, useSyncExternalStore } from "react";

type Listener = () => void;

const LOADER_TRANSITIONS: Record<string, string[]> = {
  LoadingInit: ["ErrorInit", "Settled"],
  ErrorInit: ["LoadingInit"],
};

function isValidTransition(current: string, next: string, map: Record<string, string[]>): boolean {
  return map[current]?.includes(next) ?? false;
}

export class SettledState<T> {
  readonly _tag = "Settled";
  private dataListeners = new Set<Listener>();
  private loadingListeners = new Set<Listener>();
  private loading = false;
  constructor(public data: T) {}
  // loading
  private loadingSubscribe(cb: Listener) {
    this.loadingListeners.add(cb);
    return () => {
      this.loadingListeners.delete(cb);
    };
  }
  private getLoadingSnapshot() {
    return this.loading;
  }
  useLoading() {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useSyncExternalStore(this.loadingSubscribe, this.getLoadingSnapshot);
  }
  setLoading(value: boolean) {
    this.loading = value;
    this.loadingListeners.forEach((l) => l());
  }
  // data
  private dataSubscribe(cb: Listener) {
    this.dataListeners.add(cb);
    return () => {
      this.dataListeners.delete(cb);
    };
  }
  private getDataSnapshot() {
    return this.data;
  }
  useData() {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const data = useSyncExternalStore(this.dataSubscribe, this.getDataSnapshot);
    return data;
  }
  setData(value: T) {
    this.data = value;
    this.dataListeners.forEach((l) => l());
  }
  // error
  useError<E>() {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useState<null | E>(null);
  }
}

class LoadingState<T, E = never> {
  readonly _tag = "LoadingState";
  constructor(
    private effect: Effect.Effect<T, E>,
    private transition: <S extends State<T, E>>(state: S, post?: (state: S) => void) => void,
  ) {}
  async init() {
    const effect = this.effect;
    const transition = this.transition;
    const either = await Effect.runPromise(pipe(effect, Effect.either));
    const res = Either.match(either, {
      onLeft(error) {
        return new ErrorState(effect, error, transition);
      },
      onRight(data) {
        return new SettledState(data);
      },
    });
    transition(res);
  }
}

class ErrorState<T, E> {
  readonly _tag = "ErrorState";
  constructor(
    private effect: Effect.Effect<T, E>,
    readonly error: E,
    private transition: <S extends State<T, E>>(state: S, post?: (state: S) => void) => void,
  ) {}
  retry() {
    const state = new LoadingState(this.effect, this.transition);
    this.transition(state, (state) => {
      state.init();
    });
  }
}

type State<T, E> = LoadingState<T, E> | ErrorState<T, E> | SettledState<T>;

export class LoaderClass<T, E = never> {
  private state: State<T, E>;
  private listeners = new Set<Listener>();
  constructor(effect: Effect.Effect<T, E>) {
    this.state = new LoadingState(effect, this.transition);
  }
  private subscribe(cb: Listener) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }
  private getSnapshot() {
    return this.state;
  }
  private transition<S extends State<T, E>>(state: S, post?: (state: S) => void) {
    if (!isValidTransition(this.state._tag, state._tag, LOADER_TRANSITIONS)) return;
    this.state = state;
    if (post) {
      post(state);
    }
    this.listeners.forEach((l) => l());
  }
  useState() {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const value = useSyncExternalStore(this.subscribe, this.getSnapshot);
    return value;
  }
}

export function createLoader<T, E = never>(effect: Effect.Effect<T, E>) {
  return new LoaderClass(effect);
}

/**
 * Handles the initial loading state. Create loaders at module level.
 * @example
 * const loader = createLoader({ init: fetchUser, update: refreshUser });
 *
 * function App() {
 *   return (
 *     <WithLoader loader={loader} loading={<Spinner />} error={(e, retry) => <ErrorBanner error={e} onRetry={retry} />}>
 *       {(state) => <UserProfile state={state} />}
 *     </WithLoader>
 *   );
 * }
 */
type WithLoaderProps<T, E = never> = {
  loader: LoaderClass<T, E>;
  loading?: React.ReactNode;
  error?: (e: E, retry: () => void) => React.ReactNode;
  children: (state: SettledState<T>) => React.ReactNode;
};
export function WithLoader<T, E = never>({
  children,
  error,
  loading,
  loader,
}: WithLoaderProps<T, E>) {
  const state = loader.useState();

  // on mount, run this
  useEffect(() => {
    async function init() {
      if (state._tag !== "LoadingState") return;
      await state.init();
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  switch (state._tag) {
    case "ErrorState":
      return error === undefined ? null : error(state.error, () => state.retry());
    case "LoadingState":
      return loading ?? null;
    case "Settled":
      return children(state);
  }
}

type StaticLoaderProps<T, E = never> = {
  loader: LoaderClass<T, E>;
  loading?: React.ReactNode;
  error?: (e: E, retry: () => void) => React.ReactNode;
  children: (data: T) => React.ReactNode;
};
export function StaticLoader<T, E = never>({
  children,
  error,
  loading,
  loader,
}: StaticLoaderProps<T, E>) {
  const state = loader.useState();

  // on mount, run this
  useEffect(() => {
    async function init() {
      if (state._tag !== "LoadingState") return;
      await state.init();
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  switch (state._tag) {
    case "ErrorState":
      return error === undefined ? null : error(state.error, () => state.retry());
    case "LoadingState":
      return loading ?? null;
    case "Settled":
      return children(state.data);
  }
}

// /**
// // Usage:
// // - Create loaders at module level (not inside components)
// // - Loader instances persist across renders for caching
// // - Do NOT pass different loader instances via props
// //
// // State machine:
// //
// //   ┌─────────┐
// //   │ loading │──────┐
// //   └─────────┘      │
// //       ▲  │         ▼
// //       |  │    ┌───────────┐
// //       |  │    │  settled  │
// //       |  │    └───────────┘
// //       |  │
// //       |  ▼
// //   ┌─────────┐
// //   │  error  │
// //   └─────────┘
// //
// // Transitions:
// //   loading  → settled | error
// //   error    → loading
// //
