import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { Loading } from "./z-Loading";

const Page = lazy(() => import("./page"));
const Layout = lazy(() => import("./layout"));

export const shopRoute: RouteObject = {
  path: "shop",
  Component: () => (
    <Suspense fallback={<Loading />}>
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
        <Suspense fallback={<Loading />}>
          <Page />
        </Suspense>
      ),
      ErrorBoundary: lazy(() => import("./z-RedirectErrorBoundary")),
    },
  ],
};
