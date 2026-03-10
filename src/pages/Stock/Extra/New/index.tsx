import { RouteObject } from "react-router";
import { lazy } from "react";
import { admin } from "~/middleware/admin.ts";

const Page = lazy(() => import("./page.tsx"));

export const route: RouteObject = {
  Component: Page,
  middleware: [admin],
  path: "extra/new",
};
