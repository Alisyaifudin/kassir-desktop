import { lazy } from "react";
import { RouteObject } from "react-router";
import { loader } from "./loader";
import { action } from "./action";

const Page = lazy(() => import("./page"));

export const route: RouteObject = {
  index: true,
  Component: Page,
  loader,
  action,
};
