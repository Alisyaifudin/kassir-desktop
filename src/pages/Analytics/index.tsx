import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { cashflowRoute } from "./Cashflow";
import { netRoute } from "./Net";
import { crowdRoute } from "./Crowd";
import { productRoute } from "./Product";
import { Loading } from "./z-Loading";

const Page = lazy(() => import("./page"));

export const analRoute: RouteObject = {
  path: "analytics",
  Component: () => (
    <Suspense fallback={<Loading />}>
      <Page />
    </Suspense>
  ),
  children: [cashflowRoute, netRoute, crowdRoute, productRoute],
};
