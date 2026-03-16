import { RouteObject } from "react-router";
import { lazy, Suspense } from "react";

const Page = lazy(() => import("./page"));

export const searchRoute: RouteObject = {
  path: "search",
  Component: () => (
    <Suspense>
      <Page />
    </Suspense>
  ),
};
