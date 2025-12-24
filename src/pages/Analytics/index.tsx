import { lazy } from "react";
import { RouteObject } from "react-router";
import { admin } from "~/middleware/admin";
import { cashflowRoute } from "./Cashflow";
import { netRoute } from "./Net";
import { crowdRoute } from "./Crowd";
import { productRoute } from "./Product";

const Page = lazy(() => import("./page"));

export const route: RouteObject = {
  path: "analytics",
  middleware: [admin],
  Component: Page,
  children: [cashflowRoute, netRoute, crowdRoute, productRoute],
};
