import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { AdminOnly } from "../z-AdminOnly";

const Page = lazy(() => import("./page"));

export const shopRoute: RouteObject = {
  Component: () => (
    <AdminOnly>
      <Suspense>
        <Page />
      </Suspense>
    </AdminOnly>
  ),
  path: "shop",
};
