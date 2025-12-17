import { RouteObject } from "react-router";
import { route as newProductRoute } from "./New-Product/index.tsx";
import { route as productRoute } from "./product";
import { route as newExtraRoute } from "./New-Extra/index.tsx";
import { route as extraRoute } from "./Extra/index.tsx";
import { lazy } from "react";
import { loader } from "./loader.ts";

const Page = lazy(() => import("./page.tsx"));

export const route: RouteObject = {
  path: "stock",
  children: [
    {
      index: true,
      Component: Page,
      loader,
    },
    newProductRoute,
    productRoute,
    newExtraRoute,
    extraRoute,
  ],
};
