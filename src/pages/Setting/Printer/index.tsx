import { lazy } from "react";
import { RouteObject } from "react-router";

const Page = lazy(() => import("./page"));

export const printerRoute: RouteObject = {
  Component: Page,
  path: "printer",
};
