import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { AdminOnly } from "~/components/AdminOnly";
import { Loading } from "./z-Loading";

const Page = lazy(() => import("./page"));

export const methodRoute: RouteObject = {
  Component: () => (
    <AdminOnly fallback="/setting">
      <Suspense fallback={<Loading />}>
        <Page />
      </Suspense>
    </AdminOnly>
  ),
  path: "method",
};
