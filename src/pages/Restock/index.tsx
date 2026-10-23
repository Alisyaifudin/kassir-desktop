import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { CartLoading } from "~/components/cart/z-CartLoading";

const Page = lazy(() => import("./page"));

export const restockRoute: RouteObject = {
  Component: () => (
    <Suspense fallback={<CartLoading />}>
      <Page />
    </Suspense>
  ),
  path: "restock",
};
