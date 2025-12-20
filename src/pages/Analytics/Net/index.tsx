import { lazy } from "react";
import { RouteObject } from "react-router";
import { loader } from "../Cashflow/loader";

const Page = lazy(() => import("./page"));

export const netRoute: RouteObject = {
  path: "net",
  Component: Page,
  loader,
};
