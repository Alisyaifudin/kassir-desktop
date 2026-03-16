import { RouteObject } from "react-router";
import { lazy, Suspense } from "react";

const Page = lazy(() => import("./page.tsx"));

export const imageRoute: RouteObject = {
  Component: () => (
    <Suspense>
      <Page />
    </Suspense>
  ),
  path: "images",
};
