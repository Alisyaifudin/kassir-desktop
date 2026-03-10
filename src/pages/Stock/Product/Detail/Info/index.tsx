import { RouteObject } from "react-router";
import { lazy } from "react";

const Page = lazy(() => import("./page.tsx"));

export const detailRoute: RouteObject = {
  Component: Page,
  index: true,
};
