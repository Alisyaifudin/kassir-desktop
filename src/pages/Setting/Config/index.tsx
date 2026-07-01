import { Effect } from "effect";
import { Suspense } from "react";
import { RouteObject } from "react-router";
import { lazyEffect } from "~/lib/lazy";
import { authMiddlewareEffect } from "~/middleware/auth";
import { Loading } from "./z-Loading";

export const configRouteEffect = Effect.gen(function* () {
  const Page = yield* lazyEffect(() => import("./page"));
  const authMiddleware = yield* authMiddlewareEffect;
  const route: RouteObject = {
    middleware: [authMiddleware],
    Component: () => (
      <Suspense fallback={<Loading />}>
        <Page />
      </Suspense>
    ),
    path: "config",
  };
  return route;
});
