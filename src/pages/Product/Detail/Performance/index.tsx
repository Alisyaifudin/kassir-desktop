import { RouteObject } from "react-router";
import { lazy, Suspense } from "react";

const Page = lazy(() => import("./page.tsx"));

export const perfRoute: RouteObject = {
  Component: () => (
    <Suspense>
      <Page />
    </Suspense>
  ),
  path: "performance",
};
