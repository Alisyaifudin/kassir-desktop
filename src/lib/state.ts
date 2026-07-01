// import { Effect } from "effect";
// import { useEffect, useSyncExternalStore } from "react";

export type Listener = () => void;

// export type Status<E> =
//   | {
//       state: "loading";
//       error?: undefined;
//     }
//   | { state: "error"; error: E }
//   | { state: "success"; error?: undefined };
// /**
//  * Reactive state machine for a one-shot async load (init → success/error).
//  *
//  * Exposes a `useStatus()` React hook that returns the current {@link Status}.
//  * The effect is only run once on first mount. After that, subsequent mounts
//  * see the cached result.
//  *
//  * States:
//  * - `loading` — initial state, effect not yet resolved
//  * - `success` — effect completed successfully
//  * - `error` — effect failed with an error
//  *
//  * @example
//  * ```ts
//  * const status = new StatusState(loadEffect);
//  * // Provide as a service property:
//  * useStatus: status.useStatus,
//  *
//  * // In a component:
//  * const status = useStatus();
//  * // status.state is "loading" | "success" | "error"
//  * ```
//  */
// export class StatusState<E> {
//   listeners = new Set<Listener>();
//   state: Status<E> = { state: "loading" };
//   fetching = false;
//   constructor(private loader: () => Effect.Effect<void, E>) {}
//   notify() {
//     this.listeners.forEach((l) => l());
//   }
//   getSnapshot() {
//     return this.state;
//   }
//   subscribe(cb: Listener) {
//     this.listeners.add(cb);
//     return () => {
//       this.listeners.delete(cb);
//     };
//   }
//   useStatus = () => {
//     const value = useSyncExternalStore(this.subscribe, this.getSnapshot);
//     useEffect(() => {
//       if (!this.fetching && value.state === "loading") {
//         this.fetching = true;
//         Effect.runPromise(this.loader()).finally(() => {
//           this.fetching = false;
//         });
//       }
//     }, [value.state]);
//     return value;
//   };
//   setSuccess() {
//     this.state = { state: "success" };
//     this.notify();
//   }
//   setError(error: E) {
//     this.state = { state: "error", error };
//     this.notify();
//   }
//   setLoading() {
//     this.state = { state: "loading" };
//     this.notify();
//   }
// }

// export class DataStateUnsafe<T> {
//   listeners = new Set<Listener>();
//   private data: T | null = null;
//   private notify() {
//     this.listeners.forEach((l) => l());
//   }
//   getSnapshot() {
//     return this.data;
//   }
//   private subscribe(cb: Listener) {
//     this.listeners.add(cb);
//     return () => {
//       this.listeners.delete(cb);
//     };
//   }
//   useData = () => {
//     const value = useSyncExternalStore(this.subscribe, this.getSnapshot);
//     if (value === null) throw new Error("Must be wrapped in <StateWrap>")
//     return value;
//   };
//   setData = (data: T) => {
//     this.data = data;
//     this.notify();
//   };
// }

// export class DataState<T> {
//   listeners = new Set<Listener>();
//   constructor(
//     private data: T,
//     private setDataSource: (data: T) => void,
//   ) {}
//   private notify() {
//     this.listeners.forEach((l) => l());
//   }
//   getSnapshot() {
//     return this.data;
//   }
//   private subscribe(cb: Listener) {
//     this.listeners.add(cb);
//     return () => {
//       this.listeners.delete(cb);
//     };
//   }
//   useData = () => {
//     const value = useSyncExternalStore(this.subscribe, this.getSnapshot);
//     return value;
//   };
//   setData = (data: T) => {
//     this.setDataSource(data);
//     this.data = data;
//     this.notify();
//   };
// }
