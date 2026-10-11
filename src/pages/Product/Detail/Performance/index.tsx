import { RouteObject } from "react-router";
import { lazy, Suspense } from "react";
import { Loading } from "../z-Loading";

const Page = lazy(() => import("./page.tsx"));

export const perfRoute: RouteObject = {
  Component: () => (
    <Suspense fallback={<Loading />}>
      <Page />
    </Suspense>
  ),
  path: "performance",
};
