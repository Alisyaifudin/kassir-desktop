import { Effect, pipe, Runtime } from "effect";
import { JSX, use } from "react";

export function lazyEffect<E, R>(
  loader: () => Promise<{ default: Effect.Effect<() => JSX.Element, E, R> }>,
): Effect.Effect<() => JSX.Element, E, R> {
  return pipe(
    Effect.runtime<R>(),
    Effect.map((rt) => {
      let page: (() => JSX.Element) | undefined;
      let pending: Promise<void> | undefined;

      return function Page() {
        if (page) return page();
        pending ??= Runtime.runPromise(rt)(
          pipe(
            Effect.promise(loader),
            Effect.flatMap((m) => m.default),
          ),
        ).then((fn) => {
          page = fn;
        });
        use(pending);
        return page!();
      };
    }),
  );
}
