import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { cashflowRoute } from "./Cashflow";
import { netRoute } from "./Net";
import { crowdRoute } from "./Crowd";
import { productRoute } from "./Product";

const Page = lazy(() => import("./page"));

export const route: RouteObject = {
  path: "analytics",
  Component: () => (
    <Suspense>
      <Page />
    </Suspense>
  ),
  children: [cashflowRoute, netRoute, crowdRoute, productRoute],
};
