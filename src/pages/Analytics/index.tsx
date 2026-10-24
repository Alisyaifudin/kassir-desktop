import { lazy } from "react";
import { RouteObject } from "react-router";
import Page from "./page";

const Cashflow = lazy(() => import("./Cashflow/page"));
const Profit = lazy(() => import("./Profit/page"));
const Products = lazy(() => import("./Products/page"));
const Time = lazy(() => import("./Time/page"));
const Payments = lazy(() => import("./Payments/page"));

/**
 * `/analytics`: a rail of five questions over one shared period, and the one
 * place on the app's critical path that should stay split.
 *
 * The layout is eager and the five bodies are not. The rail, the range bar and
 * the bucket control are static — every word of them comes from the URL — while
 * the bodies are the app's only chart surface, which is ~520 kB of `recharts`
 * and its d3 stack. A shop that never opens this screen should not parse it, and
 * the `Suspense` around the layout's `Outlet` means switching between the five
 * keeps the chrome and waits on the body alone.
 */
export const analyticsRoute: RouteObject = {
  path: "analytics",
  Component: Page,
  children: [
    { index: true, element: <Cashflow /> },
    { path: "laba", element: <Profit /> },
    { path: "produk", element: <Products /> },
    { path: "waktu", element: <Time /> },
    { path: "pembayaran", element: <Payments /> },
  ],
};
