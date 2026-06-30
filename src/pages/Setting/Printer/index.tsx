import { Suspense } from "react";
import { RouteObject } from "react-router";
import { Loading } from "./z-Loading";
import { Effect } from "effect";
import { lazyEffect } from "~/lib/lazy";
import { adminMiddlewareEffect } from "~/middleware/admin";

export const printerRouteEffect = Effect.gen(function* () {
  const Page = yield* lazyEffect(() => import("./page"));
  const adminMiddleware = yield* adminMiddlewareEffect;
  const route: RouteObject = {
    middleware: [adminMiddleware],
    Component: () => (
      <Suspense fallback={<Loading />}>
        <Page />
      </Suspense>
    ),
    path: "printer",
  };
  return route;
});
