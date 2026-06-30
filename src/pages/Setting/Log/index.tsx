import { Effect } from "effect";
import { Suspense } from "react";
import { RouteObject } from "react-router";
import { lazyEffect } from "~/lib/lazy";
import { adminMiddlewareEffect } from "~/middleware/admin";
import { Loading } from "./z-Loading";

export const logRouteEffect = Effect.gen(function* () {
  const Page = yield* lazyEffect(() => import("./page"));
  const adminMiddleware = yield* adminMiddlewareEffect;
  const route: RouteObject = {
    Component: () => (
      <Suspense fallback={<Loading />}>
        <Page />
      </Suspense>
    ),
    middleware: [adminMiddleware],
    path: "log",
  };
  return route;
});
