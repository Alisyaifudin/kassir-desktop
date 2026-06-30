import { Effect } from "effect";
import { useEffect, useSyncExternalStore } from "react";

export type Listener = () => void;

export type Status<E> =
  | {
      state: "loading";
      error?: undefined;
    }
  | { state: "error"; error: E }
  | { state: "success"; error?: undefined };
/**
 * Reactive state machine for a one-shot async load (init → success/error).
 *
 * Exposes a `useStatus()` React hook that returns the current {@link Status}.
 * The effect is only run once on first mount. After that, subsequent mounts
 * see the cached result.
 *
 * States:
 * - `loading` — initial state, effect not yet resolved
 * - `success` — effect completed successfully
 * - `error` — effect failed with an error
 *
 * @example
 * ```ts
 * const status = new StatusState(loadEffect);
 * // Provide as a service property:
 * useStatus: status.useStatus,
 *
 * // In a component:
 * const status = useStatus();
 * // status.state is "loading" | "success" | "error"
 * ```
 */
export class StatusState<E> {
  listeners = new Set<Listener>();
  state: Status<E> = { state: "loading" };
  fetching = false;
  constructor(private loader: () => Effect.Effect<void, E>) {}
  notify() {
    this.listeners.forEach((l) => l());
  }
  getSnapshot() {
    return this.state;
  }
  subscribe(cb: Listener) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }
  useStatus = () => {
    const value = useSyncExternalStore(this.subscribe, this.getSnapshot);
    useEffect(() => {
      if (!this.fetching && value.state === "loading") {
        this.fetching = true;
        Effect.runPromise(this.loader()).finally(() => {
          this.fetching = false;
        });
      }
    }, [value.state]);
    return value;
  };
  setSuccess() {
    this.state = { state: "success" };
    this.notify();
  }
  setError(error: E) {
    this.state = { state: "error", error };
    this.notify();
  }
  setLoading() {
    this.state = { state: "loading" };
    this.notify();
  }
}

export type Settled<T, E> =
  | { data: T; state: "success"; error?: undefined }
  | { data: T; state: "loading"; error?: undefined }
  | { error: E; data: T; state: "error" };

/**
 * Reactive state machine for mutable data with optimistic writes.
 *
 * Exposes a `useData()` React hook that returns the current {@link Settled}
 * state, and a `setData(data)` method to persist changes.
 *
 * Must be seeded with a value before `useData()` is called (throws otherwise).
 * The service layer seeds it by calling `setData` during the load phase.
 *
 * States:
 * - `success` — data persisted, no pending write
 * - `loading` — write in progress, UI shows optimistic data, form disabled
 * - `error` — write failed, UI shows stale data + error message
 *
 * @example
 * ```ts
 * const infoData = new DataState<Info, string>(persistFn);
 * // Provide as a service property:
 * info: infoData,
 *
 * // In a component:
 * const state = infoService.info;
 * const useInfo = state.useData;
 * const setInfo = state.setData;
 * const { data, state, error } = useInfo();
 * // data: Info, state: "success" | "loading" | "error", error: string | undefined
 * // setInfo(newData) — persists with optimistic update
 * ```
 */
export class AsyncDataState<T, E> {
  listeners = new Set<Listener>();
  state: Settled<T, E> | null = null;
  constructor(private setDataSource: (data: T) => Effect.Effect<void, E>) {}
  private notify() {
    this.listeners.forEach((l) => l());
  }
  private getSnapshot() {
    return this.state;
  }
  private subscribe(cb: Listener) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }
  useData = () => {
    const value = useSyncExternalStore(this.subscribe, this.getSnapshot);
    if (value === null) throw new Error("No value yet");
    return value;
  };
  setData = async (data: T) => {
    if (this.state === null) return;
    const dataOld = this.state.data;
    this.state = { state: "loading", data };
    this.notify();
    const error = await Effect.runPromise(
      this.setDataSource(data).pipe(
        Effect.as(null),
        Effect.catchAll((e) => Effect.succeed(e)),
      ),
    );
    if (error) {
      this.state = { state: "error", data: dataOld, error };
    } else {
      this.state = { state: "success", data };
    }
    this.notify();
  };
  setError(error: E) {
    if (this.state === null) return;
    this.state = { state: "error", error, data: this.state.data };
    this.notify();
  }
  setLoading() {
    if (this.state === null) return;
    this.state = { state: "loading", data: this.state.data };
    this.notify();
  }
}

export class DataState<T> {
  listeners = new Set<Listener>();
  constructor(
    private data: T,
    private setDataSource: (data: T) => void,
  ) {}
  private notify() {
    this.listeners.forEach((l) => l());
  }
  getSnapshot() {
    return this.data;
  }
  private subscribe(cb: Listener) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }
  useData = () => {
    const value = useSyncExternalStore(this.subscribe, this.getSnapshot);
    return value;
  };
  setData = (data: T) => {
    this.setDataSource(data);
    this.data = data;
    this.notify();
  };
}
