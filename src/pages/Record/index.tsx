import { RouteObject } from "react-router";
import { route as itemRoute } from "./Item";
import { lazy, Suspense } from "react";
import { searchRoute } from "./Search";
import { Loading } from "./z-Loading";

const Page = lazy(() => import("./page"));

export const route: RouteObject = {
  path: "records",
  children: [
    {
      Component: () => (
        <Suspense fallback={<Loading />}>
          <Page />
        </Suspense>
      ),
      index: true,
    },
    itemRoute,
    searchRoute,
  ],
};
