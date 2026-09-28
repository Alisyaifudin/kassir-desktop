import { Atom, createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";
import { Effect } from "effect";
import { useEffect, useState } from "react";

type Init = {
  type: "init";
  isLoading: boolean;
};

type Success<T, E> = {
  type: "success";
  data: T;
  isLoading: boolean;
  error?: E;
};

type Failure<E> = {
  type: "error";
  error: E;
  isLoading: boolean;
};

export type LoaderState<T, E> = Init | Success<T, E> | Failure<E>;

/**
 * The async side-effect performed by `setOptimistic`. It receives the
 * optimistic value and resolves to `null` on success or an `E` on failure.
 * The optimistic data is kept as the success value either way, with `error` set
 * when the mutation reported one.
 */
type OptimisticMutation<T, E> = (data: T) => Effect.Effect<null | E>;

export type LoaderResult<T, E> = {
  readonly effect: Effect.Effect<T, E, never>;
  readonly atom: Atom<LoaderState<T, E>>;
  /** Read the loaded data. Must be used inside a successful `<Consumer>`. */
  useData(): T;
  useData<S>(selector: (snapshot: T) => S): S;
  /** Whether the loader is (re)fetching. Safe to call in any state. */
  useLoading(): boolean;
  /** Read the full discriminated state. Safe to call in any state. */
  useResult(): LoaderState<T, E>;
  /**
   * Runs the effect. Typed failures become the loader's `error` state; defects
   * are re-thrown so React's error boundary handles them.
   */
  run(): Promise<void>;
  setOptimistic(optimisticData: T, mutation?: OptimisticMutation<T, E>): Promise<void>;
};

export function createLoader<T, E>(effect: Effect.Effect<T, E>): LoaderResult<T, E> {
  const atom = createAtom<LoaderState<T, E>>({ type: "init", isLoading: false });

  // Bumped on every run/mutation so stale async results are discarded.
  let runId = 0;

  function useData(): T;
  function useData<S>(selector: (snapshot: T) => S): S;
  function useData<S>(selector?: (snapshot: T) => S): T | S {
    return useAtom(atom, (state) => {
      if (state.type !== "success") {
        throw new Error(
          "useData() can only be called from a component rendered inside <Consumer> after the loader has succeeded.",
        );
      }
      return selector ? selector(state.data) : state.data;
    });
  }

  function useLoading(): boolean {
    return useAtom(atom, (state) => state.isLoading);
  }

  function useResult(): LoaderState<T, E> {
    return useAtom(atom);
  }

  async function run(): Promise<void> {
    const id = ++runId;
    atom.set((prev) => ({ ...prev, isLoading: true }));

    // `Effect.match` only folds the typed `E` channel. Defects stay in the
    // cause and reject the promise below, so React can surface them.
    const state = await Effect.runPromise(
      effect.pipe(
        Effect.match({
          onSuccess: (data): LoaderState<T, E> => ({ type: "success", data, isLoading: false }),
          onFailure: (error): LoaderState<T, E> => ({ type: "error", error, isLoading: false }),
        }),
      ),
    );

    if (id === runId) atom.set(state);
  }

  async function setOptimistic(
    optimisticData: T,
    mutation?: OptimisticMutation<T, E>,
  ): Promise<void> {
    const id = ++runId;
    atom.set({
      type: "success",
      data: optimisticData,
      isLoading: mutation !== undefined,
    });

    if (mutation === undefined) return;

    // The mutation reports via its value (`null` = ok, `E` = failure); its
    // error channel is `never`, so only defects can reject here.
    const error = await Effect.runPromise(mutation(optimisticData));

    if (id === runId) {
      atom.set({
        type: "success",
        data: optimisticData,
        isLoading: false,
        error: error ?? undefined,
      });
    }
  }

  return { effect, atom, useData, useLoading, useResult, run, setOptimistic };
}

type LoaderProps<T, E> = {
  loader: LoaderResult<T, E>;
  children: React.ReactNode;
};

/**
 * Kicks off the loader's effect on mount. Typed failures render through
 * `<Consumer>`; defects are re-thrown during render so the nearest error
 * boundary handles them.
 */
export function Loader<T, E>({ loader, children }: LoaderProps<T, E>) {
  const { run } = loader;
  const [defect, setDefect] = useState<{ value: unknown } | null>(null);

  useEffect(() => {
    run().catch((value: unknown) => setDefect({ value }));
  }, [run]);

  if (defect !== null) throw defect.value;

  return children;
}

type ConsumerProps<T, E> = {
  loader: LoaderResult<T, E>;
  children: React.ReactNode;
  loading: React.ReactNode;
  Error: (props: { error: E; isLoading: boolean; reload: () => void }) => React.JSX.Element;
};

/** How long to stay blank before falling back to the `loading` view. */
const DELAY = 200;

/** Renders the right view for the loader's current state. */
export function Consumer<T, E>({ loader, Error, loading, children }: ConsumerProps<T, E>) {
  const state = useAtom(loader.atom);
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (state.type !== "init") {
      setShowLoading(false);
      return;
    }
    const timer = setTimeout(() => setShowLoading(true), DELAY);
    return () => clearTimeout(timer);
  }, [state.type]);

  switch (state.type) {
    case "init":
      // Stay blank briefly so fast loads don't flash the loading view.
      return showLoading ? loading : null;
    case "error":
      return <Error error={state.error} isLoading={state.isLoading} reload={loader.run} />;
    case "success":
      return children;
  }
}
