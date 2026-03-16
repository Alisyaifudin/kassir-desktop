import { RouteObject } from "react-router";
import { lazy, Suspense } from "react";
import { loader } from "./loader.ts";
import { imageRoute } from "./Image/index.tsx";
import { detailRoute } from "./Info/index.tsx";
import { perfRoute } from "./Performance/index.tsx";

const Page = lazy(() => import("./page.tsx"));

export const route: RouteObject = {
  Component: () => (
    <Suspense>
      <Page />
    </Suspense>
  ),
  loader,
  path: "product/:id",
  children: [imageRoute, detailRoute, perfRoute],
};
