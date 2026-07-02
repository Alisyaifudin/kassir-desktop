import { Suspense } from "react";
import { RouteObject } from "react-router";
import { adminMiddlewareEffect } from "~/middleware/admin";
import { Loading } from "./z-Loading";
import { Effect } from "effect";
import { lazyEffect } from "~/lib/lazy";
import { moneyDetailRouteEffect } from "./History";

export const moneyRouteEffect = Effect.gen(function* () {
  const Page = yield* lazyEffect(() => import("./page"));
  const moneyDetailRoute = yield* moneyDetailRouteEffect;
  const adminMiddleware = yield* adminMiddlewareEffect;
  const route: RouteObject = {
    path: "money",
    middleware: [adminMiddleware],
    children: [
      {
        index: true,
        Component: () => (
          <Suspense fallback={<Loading />}>
            <Page />
          </Suspense>
        ),
      },
      moneyDetailRoute,
    ],
  };
  return route;
});
