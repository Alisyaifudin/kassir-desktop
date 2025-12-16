import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { loader } from "./loader";
import { action } from "./action";
import { LoadingBig } from "~/components/Loading";

const Page = lazy(() => import("./page"));

export const route: RouteObject = {
  index: true,
  Component: () => (
    <Suspense fallback={<LoadingBig />}>
      <Page />
    </Suspense>
  ),
  loader,
  action,
};
