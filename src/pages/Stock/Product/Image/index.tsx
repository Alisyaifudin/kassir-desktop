import { RouteObject } from "react-router";
import { lazy, Suspense } from "react";
import { loader } from "./loader.ts";
import { action } from "./action/index.ts";
import { LoadingFull } from "~/components/Loading.tsx";

const Page = lazy(() => import("./page.tsx"));

export const imageRoute: RouteObject = {
  Component: () => (
    <Suspense fallback={<LoadingFull />}>
      <Page />
    </Suspense>
  ),
  loader,
  action,
  path: "images",
};
