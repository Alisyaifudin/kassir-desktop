import { RouteObject } from "react-router";
import { lazy } from "react";
import { action } from "./action.ts";
import { admin } from "~/middleware/admin.ts";

const Page = lazy(() => import("./page.tsx"));

export const route: RouteObject = {
  Component: Page,
  middleware: [admin],
  action,
  path: "extra/new",
};
