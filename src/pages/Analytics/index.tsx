import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { AnalyticsLoading } from "./z-Loading";
import Cashflow from "./Cashflow/page";
import Profit from "./Profit/page";
import Products from "./Products/page";
import Time from "./Time/page";
import Payments from "./Payments/page";

const Page = lazy(() => import("./page"));

/**
 * `/analytics`: a rail of five questions over one shared period. The pages are
 * bundled with this route; only the layout is lazy, so switching between them
 * never shows the full-screen skeleton again.
 */
export const analyticsRoute: RouteObject = {
  path: "analytics",
  Component: () => (
    <Suspense fallback={<AnalyticsLoading />}>
      <Page />
    </Suspense>
  ),
  children: [
    { index: true, element: <Cashflow /> },
    { path: "laba", element: <Profit /> },
    { path: "produk", element: <Products /> },
    { path: "waktu", element: <Time /> },
    { path: "pembayaran", element: <Payments /> },
  ],
};
