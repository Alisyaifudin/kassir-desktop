import { RouteObject } from "react-router";
import { lazy, Suspense } from "react";
import { AdminOnly } from "~/components/AdminOnly";
import { Loading } from "./z-Loading.tsx";

const Page = lazy(() => import("./page.tsx"));

export const newExtraRoute: RouteObject = {
  Component: () => (
    <AdminOnly fallback="/extras">
      <Suspense fallback={<Loading />}>
        <Page />
      </Suspense>
    </AdminOnly>
  ),
  path: "new",
};
