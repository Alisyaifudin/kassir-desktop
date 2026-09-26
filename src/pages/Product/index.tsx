import { RouteObject } from "react-router";
import { newProductRoute } from "./New/index.tsx";
import { productDetailRoute } from "./Detail/index.tsx";
import { lazy, Suspense } from "react";
import { Loading } from "./z-Loading.tsx";

const Page = lazy(() => import("./page.tsx"));

export const productRoute: RouteObject = {
  path: "products",
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
    productDetailRoute,
  ],
};
