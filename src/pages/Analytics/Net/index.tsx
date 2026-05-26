import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { Loading } from "../z-Loading";

const Page = lazy(() => import("./page"));

export const netRoute: RouteObject = {
  path: "net",
  Component: () => (
    <Suspense fallback={<Loading />}>
      <Page />
    </Suspense>
  ),
};
