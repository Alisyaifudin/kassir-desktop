import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";

const Page = lazy(() => import("./page"));

export const loginRoute: RouteObject = {
  path: "login",
  Component: () => (
    <Suspense>
      <Page />
    </Suspense>
  ),
};
