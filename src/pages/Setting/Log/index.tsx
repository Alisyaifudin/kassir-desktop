import { lazy } from "react";
import { RouteObject } from "react-router";
import { admin } from "~/middleware/admin";

const Page = lazy(() => import("./page"));

export const route: RouteObject = {
  Component: Page,
  middleware: [admin],
  path: "log",
};
