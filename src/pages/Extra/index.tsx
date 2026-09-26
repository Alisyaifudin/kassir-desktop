import { RouteObject } from "react-router";
import { newExtraRoute } from "./New/index.tsx";
import { extraDetailRoute } from "./Detail/index.tsx";
import { lazy, Suspense } from "react";
import { Loading } from "./z-Loading.tsx";

const Page = lazy(() => import("./page.tsx"));

export const extraRoute: RouteObject = {
  path: "extras",
  children: [
    {
      index: true,
      Component: () => (
        <Suspense fallback={<Loading />}>
          <Page />
        </Suspense>
      ),
    },
    newExtraRoute,
    extraDetailRoute,
  ],
};
