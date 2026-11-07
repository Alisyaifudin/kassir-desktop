import { lazy } from "react";
import { RouteObject } from "react-router";
import Page from "./page";

const Cashflow = lazy(() => import("./Cashflow/page"));
const Profit = lazy(() => import("./Profit/page"));
const Products = lazy(() => import("./Products/page"));
const Time = lazy(() => import("./Time/page"));
const Payments = lazy(() => import("./Payments/page"));
const Network = lazy(() => import("./Network/page"));

/**
 * `/analytics`: a rail of six questions over one shared period, and the one
 * place on the app's critical path that should stay split.
 *
 * The layout is eager and the six bodies are not. The rail, range bar and bucket
 * control are static; the chart pages load `recharts` only when opened, and the
 * network page loads its canvas code only when needed. A shop that never opens
 * Analytics should not parse any of that, and the `Suspense` around the layout's
 * `Outlet` means switching between the six keeps the chrome and waits on the body.
 */
export const analyticsRoute: RouteObject = {
  path: "analytics",
  Component: Page,
  children: [
    { index: true, element: <Cashflow /> },
    { path: "profit", element: <Profit /> },
    { path: "products", element: <Products /> },
    { path: "time", element: <Time /> },
    { path: "payments", element: <Payments /> },
  ],
};

/** The product network keeps the Analytics shell but owns the top-level `/network` URL. */
export const networkRoute: RouteObject = {
  path: "network",
  Component: Page,
  children: [{ index: true, element: <Network /> }],
};
