import { RouteObject } from "react-router";
import { newProductRoute } from "./product/New/index.tsx";
import { productRoute } from "./product/Detail/index.tsx";
import { newExtraRoute } from "./Extra/New/index.tsx";
import { extraRoute } from "./Extra/Detail/index.tsx";
import { lazy, Suspense } from "react";
import { Loading } from "./z-Loading.tsx";

const Page = lazy(() => import("./page.tsx"));

export const stockRoute: RouteObject = {
  path: "stock",
  children: [
    {
      index: true,
      Component: () => (
        <Suspense fallback={<Loading />}>
          <Page />
        </Suspense>
      ),
    },
    newProductRoute,
    productRoute,
    newExtraRoute,
    extraRoute,
  ],
};
