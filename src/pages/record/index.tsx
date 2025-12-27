import { RouteObject } from "react-router";
import { route as itemRoute } from "./Record-Item";
import { lazy } from "react";
import { loader } from "./loader";
import { action } from "./action";
import { searchRoute } from "./Search";

const Page = lazy(() => import("./page"));

export const route: RouteObject = {
  path: "records",
  children: [
    {
      loader,
      action,
      Component: Page,
      index: true,
    },
    itemRoute,
    searchRoute,
  ],
};
