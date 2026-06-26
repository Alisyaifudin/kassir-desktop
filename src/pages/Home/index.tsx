import { Effect } from "effect";
import { Suspense } from "react";
import { RouteObject } from "react-router";
import { lazyEffect } from "~/lib/lazy";

export const homeRouteEffect = Effect.gen(function* () {
  const Page = yield* lazyEffect(() => import("./page"));
  const route: RouteObject = {
    index: true,
    Component: () => (
      <Suspense>
        <Page />
      </Suspense>
    ),
  };
  return route;
});
