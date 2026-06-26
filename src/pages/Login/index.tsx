import { Effect } from "effect";
import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { lazyEffect } from "~/lib/lazy";
import { loginMiddlewareEffect } from "~/middleware/login";

const ErrorBoundary = lazy(() => import("~/components/ErrorBoundary.tsx"));

export const loginRouteEffect = Effect.gen(function* () {
  const Page = yield* lazyEffect(() => import("./page"));
  const loginMiddleware = yield* loginMiddlewareEffect;
  const route: RouteObject = {
    path: "login",
    middleware: [loginMiddleware],
    ErrorBoundary,
    Component: () => (
      <Suspense>
        <Page />
      </Suspense>
    ),
  };
  return route;
});
