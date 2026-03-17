import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { admin } from "~/middleware/admin";
import { Loading } from "./z-Loading";

const Page = lazy(() => import("./page"));

export const cashierRoute: RouteObject = {
  middleware: [admin],
  Component: () => (
    <Suspense fallback={<Loading />}>
      <Page />
    </Suspense>
  ),
  path: "cashier",
};
