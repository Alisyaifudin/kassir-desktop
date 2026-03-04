import { RouteObject } from "react-router";
import { lazy, Suspense } from "react";
import { loader } from "./loader";
import { action } from "./action/index.ts";
import { LoadingFull } from "~/components/Loading.tsx";

const Page = lazy(() => import("./page.tsx"));

export const detailRoute: RouteObject = {
  Component: () => (
    <Suspense fallback={<LoadingFull />}>
      <Page />
    </Suspense>
  ),
  loader,
  action,
  index: true,
};
