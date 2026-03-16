import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { admin } from "~/middleware/admin";

const Page = lazy(() => import("./page"));

export const route: RouteObject = {
  Component: () => (
    <Suspense>
      <Page />
    </Suspense>
  ),
  path: "data",
  middleware: [admin],
};
