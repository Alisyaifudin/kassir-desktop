import { Effect } from "effect";
import { Suspense } from "react";
import { RouteObject } from "react-router";
import { lazyEffect } from "~/lib/lazy";
import { adminMiddlewareEffect } from "~/middleware/admin";
import { Loading } from "./z-Loading";

export const shopRouteEffect = Effect.gen(function* () {
  const Page = yield* lazyEffect(() => import("./page"));
  const adminMiddleware = yield* adminMiddlewareEffect;
  const route: RouteObject = {
    middleware: [adminMiddleware],
    Component: () => (
      <Suspense fallback={<Loading />}>
        <Page />
      </Suspense>
    ),
    path: "shop",
  };
  return route;
});
