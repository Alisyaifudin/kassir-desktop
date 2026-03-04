import { RouteObject } from "react-router";
import { lazy, Suspense } from "react";
import { loader } from "./loader.ts";
import { LoadingFull } from "~/components/Loading.tsx";

const Page = lazy(() => import("./page.tsx"));

export const perfRoute: RouteObject = {
  Component: () => (
    <Suspense fallback={<LoadingFull />}>
      <Page />
    </Suspense>
  ),
  loader,
  path: "performance",
};
