import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { AdminOnly } from "../z-AdminOnly";
import { Loading } from "./z-Loading";

const Page = lazy(() => import("./page"));

export const dataRoute: RouteObject = {
  Component: () => (
    <AdminOnly>
      <Suspense fallback={<Loading />}>
        <Page />
      </Suspense>
    </AdminOnly>
  ),
  path: "data",
};
