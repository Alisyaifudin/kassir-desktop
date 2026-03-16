import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { lazyLoader } from "~/lib/utils";

const Page = lazy(() => import("./page"));

export const route: RouteObject = {
  path: "login",
  loader: lazyLoader(() => import("./loader")),
  Component: () => (
    <Suspense>
      <Page />
    </Suspense>
  ),
};
