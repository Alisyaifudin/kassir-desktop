import { RouteObject } from "react-router";
import { shopRouteEffect } from "./shop";
import { dataRouteEffect } from "./data";
import { profileRouteEffect } from "./profile";
import { logRouteEffect } from "./log";
import { Effect } from "effect";
import { Suspense } from "react";
import { LoadingLayout } from "./z-LoadingLayout";
import { LoadingPage } from "./z-LoadingPage";
import { lazyEffect } from "~/lib/lazy";
import { configRouteEffect } from "./Config";

export const settingRouteEffect = Effect.gen(function* () {
  const Layout = yield* lazyEffect(() => import("./layout"));
  const SettingPage = yield* lazyEffect(() => import("./page"));
  const routes = yield* Effect.all([
    configRouteEffect,
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
      {
        index: true,
        Component: () => (
          <Suspense fallback={<LoadingPage />}>
            <SettingPage />
          </Suspense>
        ),
      },
    ],
  };
  return route;
});
