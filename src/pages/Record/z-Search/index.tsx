import { RouteObject } from "react-router";
import { lazy } from "react";
import { loader } from "./loader";

const Page = lazy(() => import("./page"));

export const searchRoute: RouteObject = {
  path: "search",
  Component: Page,
  loader,
};
