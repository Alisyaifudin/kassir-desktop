import { RouteObject } from "react-router";
import { newProductRoute } from "./product/New";
import { productRoute } from "./product/Detail";
import { newExtraRoute } from "./Extra/New";
import { extraRoute } from "./Extra/Detail";
import { lazy, Suspense } from "react";
import { Loading } from "./z-Loading";

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
