import { RouteObject } from "react-router";
import { lazy, Suspense } from "react";
import { Loading } from "./z-Loading";

const Page = lazy(() => import("./page"));

// `Item` and `Search` have not been moved onto the services layer yet, so only
// the list route is wired up. The UI controls that led there are disabled until
// they land.
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
  ],
};
