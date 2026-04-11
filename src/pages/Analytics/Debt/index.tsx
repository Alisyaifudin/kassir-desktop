import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { Loading } from "../z-Loading";

const Page = lazy(() => import("./page"));

export const debtRoute: RouteObject = {
  path: "debt",
  Component: () => (
    <Suspense fallback={<Loading />}>
      <Page />
    </Suspense>
  ),
};
