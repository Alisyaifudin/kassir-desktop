import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { LoadingScreen } from "../z-LoadingScreen";

const Page = lazy(() => import("./page"));

export const profileRoute: RouteObject = {
  Component: () => (
    <Suspense fallback={<LoadingScreen />}>
      <Page />
    </Suspense>
  ),
  path: "profile",
};
