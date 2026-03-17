import { RouteObject } from "react-router";
import { route as newProductRoute } from "./product/New";
import { route as productRoute } from "./product/Detail";
import { route as newExtraRoute } from "./Extra/New";
import { route as extraRoute } from "./Extra/Detail";
import { lazy, Suspense } from "react";
import { Loading } from "./z-Loading";

const Page = lazy(() => import("./page.tsx"));

export const route: RouteObject = {
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
