import { Effect, Either } from "effect";
import { useCallback, useEffect, useState } from "react";

type State<T, E> =
  | { state: "loading" }
  | { state: "error"; error: E }
  | { state: "success"; data: T };

export function WithLoader<T, E>({
  loader,
  children,
  loading,
  error,
}: {
  loader: () => Effect.Effect<T, E>;
  children: (data: T) => React.ReactNode;
  error: (error: E, retry: () => void) => React.ReactNode;
  loading?: React.ReactNode;
}) {
  const [state, setState] = useState<State<T, E>>({ state: "loading" });

  const fetchData = useCallback(async () => {
    setState({ state: "loading" });
    const either = await Effect.runPromise(loader().pipe(Effect.either));
    Either.match(either, {
      onLeft(error) {
        setState({ state: "error", error });
      },
      onRight(data) {
        setState({ state: "success", data });
      },
    });
  }, [loader]);
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  switch (state.state) {
    case "loading":
      return loading;
    case "error":
      return error(state.error, fetchData);
    case "success":
      return children(state.data);
  }
}
