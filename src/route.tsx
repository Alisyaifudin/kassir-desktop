import { createHashRouter } from "react-router";
import { route as loginRoute } from "./pages/login";
import { shopRoute as shopRoute } from "./pages/shop";
import { route as stockRoute } from "./pages/stock";
import { route as settingRoute } from "./pages/setting";
import { route as recordsRoute } from "./pages/Record/index.tsx";
import { route as moneyRoute } from "./pages/money";
import { route as analRoute } from "./pages/analytics";
import { authentication } from "./middleware/authenticate.ts";
import { lazy } from "react";
import { homeRoute } from "./pages/Home/index.ts";

const RootLayout = lazy(() => import("./layouts/root.tsx"));
const ErrorBoundary = lazy(() => import("./components/ErrorBoundary.tsx"));
const AuthLayout = lazy(() => import("./layouts/authenticated"));

export const router = createHashRouter([
  {
    path: "/",
    ErrorBoundary,
    Component: RootLayout,
    children: [
      loginRoute,
      {
        path: "/",
        middleware: [authentication],
        Component: AuthLayout,
        children: [
          homeRoute,
          shopRoute,
          settingRoute,
          stockRoute,
          moneyRoute,
          recordsRoute,
          analRoute,
        ],
      },
    ],
  },
]);
