import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";

const Page = lazy(() => import("./page"));

export const productRoute: RouteObject = {
  path: "products",
  Component: () => (
    <Suspense>
      <Page />
    </Suspense>
  ),
};
