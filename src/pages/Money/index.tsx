import { lazy } from "react";
import { RouteObject } from "react-router";
import { admin } from "~/middleware/admin";
import { action } from "./action";
import { loader } from "./loader";

const Page = lazy(() => import("./page"));

export const route: RouteObject = {
  Component: Page,
  path: "money",
  middleware: [admin],
  action,
  loader,
};
