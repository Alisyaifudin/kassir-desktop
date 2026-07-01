import { Effect } from "effect";
import { Suspense } from "react";
import { RouteObject } from "react-router";
import { lazyEffect } from "~/lib/lazy";
import { Loading } from "./z-Loading";

export const homeRouteEffect = Effect.gen(function* () {
  const Page = yield* lazyEffect(() => import("./page"));
  const route: RouteObject = {
    index: true,
    Component: () => (
      <Suspense fallback={<Loading />}>
        <Page />
      </Suspense>
    ),
  };
  return route;
});
