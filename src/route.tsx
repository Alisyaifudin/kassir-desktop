import { createHashRouter } from "react-router";
import { loginRoute } from "./pages/login";
import { shopRoute } from "./pages/shop";
import { stockRoute } from "./pages/stock";
import { settingRoute } from "./pages/setting";
import { recordRoute } from "./pages/Record/index.tsx";
import { moneyRoute } from "./pages/money";
import { analRoute } from "./pages/analytics";
import { cashierRoute } from "./pages/Cashier/index.tsx";
import { customerRoute } from "./pages/Customer/index.tsx";
import { methodRoute } from "./pages/Method/index.tsx";
import { socialRoute } from "./pages/Social/index.tsx";
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
          cashierRoute,
          customerRoute,
          methodRoute,
          socialRoute,
          homeRoute,
          shopRoute,
          settingRoute,
          stockRoute,
          moneyRoute,
          recordRoute,
          analRoute,
        ],
      },
    ],
  },
]);
