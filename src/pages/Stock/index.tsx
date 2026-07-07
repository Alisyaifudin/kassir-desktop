import { redirect, RouteObject } from "react-router";
import { lazy, Suspense } from "react";
import { Effect } from "effect";
import { authMiddlewareEffect } from "~/middleware/auth.ts";

const Page = lazy(() => import("./page.tsx"));

export const stockRouteEffect = Effect.gen(function* () {
  const authMiddleware = yield* authMiddlewareEffect;
  const stockRoute: RouteObject = {
    path: "stock",
    middleware: [authMiddleware],
    Component: () => (
      <Suspense>
        <Page />
      </Suspense>
    ),
    children: [
      {
        index: true,
        loader: () => {
          throw redirect("/stock/product");
        },
      },
    ],
  };
  return stockRoute;
});
