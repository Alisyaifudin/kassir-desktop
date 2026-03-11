import { RouteObject } from "react-router";
import { route as itemRoute } from "./Item";
import { lazy } from "react";
import { searchRoute } from "./Search";

const Page = lazy(() => import("./page"));

export const route: RouteObject = {
  path: "records",
  children: [
    {
      Component: Page,
      index: true,
    },
    itemRoute,
    searchRoute,
  ],
};
