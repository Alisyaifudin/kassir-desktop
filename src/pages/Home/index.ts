import { lazy } from "react";
import { RouteObject } from "react-router";

const Page = lazy(() => import("./page"));

export const homeRoute: RouteObject = {
  index: true,
  Component: Page,
};
