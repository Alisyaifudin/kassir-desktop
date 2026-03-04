import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";

const Page = lazy(() => import("./page"));

export const route: RouteObject = {
  index: true,
  Component: () => (
    <Suspense>
      <Page />
    </Suspense>
  ),
};
