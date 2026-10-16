import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { Loading } from "./z-Loading";
import { moneyHistoryRoute } from "./History";

const Page = lazy(() => import("./page"));

export const moneyRoute: RouteObject = {
  path: "money",
  children: [
    {
      index: true,
      Component: () => (
        <Suspense fallback={<Loading />}>
          <Page />
        </Suspense>
      ),
    },
    moneyHistoryRoute,
  ],
};
