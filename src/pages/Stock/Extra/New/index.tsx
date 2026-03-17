import { RouteObject } from "react-router";
import { lazy, Suspense } from "react";
import { admin } from "~/middleware/admin.ts";
import { Loading } from "./z-Loading";

const Page = lazy(() => import("./page.tsx"));

export const route: RouteObject = {
  Component: () => (
    <Suspense fallback={<Loading />}>
      <Page />
    </Suspense>
  ),
  middleware: [admin],
  path: "extra/new",
};
