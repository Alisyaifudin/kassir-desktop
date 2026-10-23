import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { AdminOnly } from "~/components/AdminOnly";
import { LoadingScreen } from "../z-LoadingScreen";

const Page = lazy(() => import("./page"));

export const shopRoute: RouteObject = {
  Component: () => (
    <AdminOnly>
      <Suspense fallback={<LoadingScreen />}>
        <Page />
      </Suspense>
    </AdminOnly>
  ),
  path: "shop",
};
