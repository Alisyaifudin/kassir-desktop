import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { admin } from "~/middleware/admin";
import { Loading } from "./z-Loading";
import { moneyDetailRoute } from "./History";

const Layout = lazy(() => import("./layout"));
const Page = lazy(() => import("./page"));

export const moneyRoute: RouteObject = {
  Component: () => (
    <Suspense fallback={<Loading />}>
      <Layout />
    </Suspense>
  ),
  path: "money",
  middleware: [admin],
  children: [
    {
      index: true,
      Component: () => (
        <Suspense fallback={<Loading />}>
          <Page />
        </Suspense>
      ),
    },
    moneyDetailRoute,
  ],
};
