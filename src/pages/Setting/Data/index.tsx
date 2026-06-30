import { Suspense } from "react";
import { RouteObject } from "react-router";
import { adminMiddlewareEffect } from "~/middleware/admin";
import { Effect } from "effect";
import { lazyEffect } from "~/lib/lazy";
import { Loading } from "./z-Loading";

export const dataRouteEffect = Effect.gen(function* () {
  const Page = yield* lazyEffect(() => import("./page"));
  const adminMiddleware = yield* adminMiddlewareEffect;
  const route: RouteObject = {
    middleware: [adminMiddleware],
    Component: () => (
      <Suspense fallback={<Loading />}>
        <Page />
      </Suspense>
    ),
    path: "data",
  };
  return route;
});
