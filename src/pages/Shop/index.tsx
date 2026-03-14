import { lazy } from "react";
import { RouteObject } from "react-router";

const Page = lazy(() => import("./page"));
const Layout = lazy(() => import("./layout"));

export const shopRoute: RouteObject = {
  path: "shop",
  Component: Layout,
  children: [
    {
      index: true,
      Component: lazy(() => import("./z-Right/Header/z-NotFound")),
    },
    {
      path: ":tab",
      Component: Page,
      ErrorBoundary: lazy(() => import("./z-RedirectErrorBoundary")),
    },
  ],
};
