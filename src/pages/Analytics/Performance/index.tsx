import { lazy } from "react";
import { RouteObject } from "react-router";
import { loader } from "./loader";

const Page = lazy(() => import("./page"));

export const performanceRoute: RouteObject = {
  path: "performance",
  Component: Page,
  loader,
};
