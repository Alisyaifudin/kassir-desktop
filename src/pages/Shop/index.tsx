import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";

const Page = lazy(() => import("./page"));
const Layout = lazy(() => import("./layout"));

export const shopRoute: RouteObject = {
  path: "shop",
  Component: () => (
    <Suspense>
      <Layout />
    </Suspense>
  ),
  children: [
    {
      index: true,
      Component: lazy(() => import("./z-Right/Header/z-NotFound")),
    },
    {
      path: ":tab",
      Component: () => (
        <Suspense>
          <Page />
        </Suspense>
      ),
      ErrorBoundary: lazy(() => import("./z-RedirectErrorBoundary")),
    },
  ],
};
