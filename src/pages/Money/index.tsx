import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { admin } from "~/middleware/admin";
import { Loading } from "./z-Loading";

const Page = lazy(() => import("./page"));

export const route: RouteObject = {
  Component: () => (
    <Suspense fallback={<Loading />}>
      <Page />
    </Suspense>
  ),
  path: "money",
  middleware: [admin],
};
