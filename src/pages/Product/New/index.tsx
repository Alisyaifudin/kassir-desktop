import { RouteObject } from "react-router";
import { lazy, Suspense } from "react";
import { Loading } from "./z-Loading.tsx";

const Page = lazy(() => import("./page.tsx"));

export const newProductRoute: RouteObject = {
  Component: () => (
    <Suspense fallback={<Loading />}>
      <Page />
    </Suspense>
  ),
  path: "new",
};
