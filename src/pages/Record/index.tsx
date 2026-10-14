import { RouteObject } from "react-router";
import { lazy, Suspense } from "react";
import { searchRoute } from "./Search";
import { Loading } from "./z-Loading";

const Page = lazy(() => import("./page"));

// `Item` is still on the old data layer, so it stays out; the search page is
// wired and its result rows link to `/records/:id` for when Item lands.
export const recordRoute: RouteObject = {
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
    searchRoute,
  ],
};
