import { lazy } from "react";
import { RouteObject } from "react-router";
import { admin } from "~/middleware/admin";

const Page = lazy(() => import("./page"));

export const route: RouteObject = {
  middleware: [admin],
  Component: Page,
  path: "shop",
};
