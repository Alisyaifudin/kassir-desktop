import { RouteObject } from "react-router";
import { lazy } from "react";

const Page = lazy(() => import("./page.tsx"));

export const imageRoute: RouteObject = {
  Component: Page,
  path: "images",
};
