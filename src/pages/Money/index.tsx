import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { admin } from "~/middleware/admin";
import { action } from "./action";
import { loader } from "./loader";
import { LoadingBig } from "~/components/Loading";

const Page = lazy(() => import("./page"));

export const route: RouteObject = {
  Component: () => (
    <Suspense fallback={<LoadingBig />}>
      <Page />
    </Suspense>
  ),
  path: "money",
  middleware: [admin],
  action,
  loader,
};
