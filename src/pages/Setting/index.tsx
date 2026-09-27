import { RouteObject } from "react-router";
import { shopRoute } from "./Shop";
import { dataRoute } from "./Data";
import { profileRoute } from "./Profile";
import { logRoute } from "./Log";
import { lazy, Suspense } from "react";
import { printerRoute } from "./Printer";
import { LoadingLayout } from "./z-LoadingLayout";
import { LoadingPage } from "./z-LoadingPage";

const Layout = lazy(() => import("./layout"));
const Page = lazy(() => import("./page"));

export const settingRoute: RouteObject = {
  path: "setting",
  children: [
    profileRoute,
    shopRoute,
    dataRoute,
    logRoute,
    printerRoute,
    {
      index: true,
      Component: () => (
        <Suspense fallback={<LoadingPage />}>
          <Page />
        </Suspense>
      ),
    },
  ],
  Component: () => (
    <Suspense fallback={<LoadingLayout />}>
      <Layout />
    </Suspense>
  ),
};
