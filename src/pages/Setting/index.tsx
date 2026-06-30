import { RouteObject } from "react-router";
import { shopRouteEffect } from "./shop";
import { dataRouteEffect } from "./data";
import { profileRouteEffect } from "./profile";
import { logRouteEffect } from "./log";
import { Effect } from "effect";
import { lazy, Suspense } from "react";
import { printerRoute } from "./Printer";
import { LoadingLayout } from "./z-LoadingLayout";
import { LoadingPage } from "./z-LoadingPage";
import { syncRoute } from "./Sync-PENDING";

const Layout = lazy(() => import("./layout"));
const Page = lazy(() => import("./page"));

export const settingRoute = Effect.gen(function* () {
  const routes = yield* Effect.all([
    profileRouteEffect,
    shopRouteEffect,
    dataRouteEffect,
    logRouteEffect,
  ]);
  const route: RouteObject = {
    path: "setting",
    Component: () => (
      <Suspense fallback={<LoadingLayout />}>
        <Layout />
      </Suspense>
    ),
    children: [
      ...routes,
      printerRoute,
      syncRoute,
      {
        index: true,
        Component: () => (
          <Suspense fallback={<LoadingPage />}>
            <Page />
          </Suspense>
        ),
      },
    ],
  };
  return route;
});
