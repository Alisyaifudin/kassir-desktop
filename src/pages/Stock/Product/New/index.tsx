import { RouteObject } from "react-router";
import { lazy, Suspense } from "react";
import { admin } from "~/middleware/admin.ts";

const Page = lazy(() => import("./page.tsx"));

export const route: RouteObject = {
  middleware: [admin],
  Component: () => (
    <Suspense>
      <Page />
    </Suspense>
  ),
  path: "product/new",
};
