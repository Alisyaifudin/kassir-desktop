import { RouteObject } from "react-router";
import { lazy, Suspense } from "react";
import { admin } from "~/middleware/admin.ts";
import { Loading } from "./z-Loading.tsx";

const Page = lazy(() => import("./page.tsx"));

export const newProductRoute: RouteObject = {
  middleware: [admin],
  Component: () => (
    <Suspense fallback={<Loading />}>
      <Page />
    </Suspense>
  ),
  path: "product/new",
};
