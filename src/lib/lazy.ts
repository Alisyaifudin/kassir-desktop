import { Effect, pipe, Runtime } from "effect";
import { JSX, use } from "react";

export function lazyEffect<E, R, Props>(
  loader: () => Promise<{ default: Effect.Effect<(props: Props) => JSX.Element, E, R> }>,
): Effect.Effect<(props: Props) => JSX.Element, E, R> {
  return pipe(
    Effect.runtime<R>(),
    Effect.map((rt) => {
      let page: ((props: Props) => JSX.Element) | undefined;
      let pending: Promise<void> | undefined;

      return function Page(props: Props) {
        if (page) return page(props);
        pending ??= Runtime.runPromise(rt)(
          pipe(
            Effect.promise(loader),
            Effect.flatMap((m) => m.default),
          ),
        ).then((fn) => {
          page = fn;
        });
        use(pending);
        return page!(props);
      };
    }),
  );
}
