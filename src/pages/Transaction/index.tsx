import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { Loading } from "~/components/Loading";

const Page = lazy(() => import("./page"));

export const transactionRoute: RouteObject = {
  Component: () => (
    <Suspense fallback={<Loading />}>
      <Page />
    </Suspense>
  ),
  path: "transaction",
};
