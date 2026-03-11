import { lazy } from "react";
import { RouteObject } from "react-router";

const Page = lazy(() => import("./page"));

export const netRoute: RouteObject = {
  path: "net",
  Component: Page,
};
