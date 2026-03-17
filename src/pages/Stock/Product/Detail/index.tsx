import { RouteObject } from "react-router";
import { lazy, Suspense } from "react";
import { loader } from "./loader.ts";
import { imageRoute } from "./Image/index.tsx";
import { detailRoute } from "./Info/index.tsx";
import { perfRoute } from "./Performance/index.tsx";
import { Loading } from "./z-Loading";

const Page = lazy(() => import("./page.tsx"));

export const route: RouteObject = {
  Component: () => (
    <Suspense fallback={<Loading />}>
      <Page />
    </Suspense>
  ),
  loader,
  path: "product/:id",
  children: [imageRoute, detailRoute, perfRoute],
};
