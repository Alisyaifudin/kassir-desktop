import { lazy } from "react";
import { RouteObject } from "react-router";

const Page = lazy(() => import("./page"));

export const crowdRoute: RouteObject = {
  path: "crowd",
  Component: Page,
};
