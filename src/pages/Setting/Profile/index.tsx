import { Effect } from "effect";
import { Suspense } from "react";
import { RouteObject } from "react-router";
import { lazyEffect } from "~/lib/lazy";

export const profileRouteEffect = Effect.gen(function* () {
  const Page = yield* lazyEffect(() => import("./page"));
  const route: RouteObject = {
    Component: () => (
      <Suspense>
        <Page />
      </Suspense>
    ),
    path: "profile",
  };
  return route;
});
