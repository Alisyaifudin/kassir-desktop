import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { Loading } from "../z-Loading";

const Page = lazy(() => import("./page"));

export const crowdRoute: RouteObject = {
  path: "crowd",
  Component: () => (
    <Suspense fallback={<Loading />}>
      <Page />
    </Suspense>
  ),
};
