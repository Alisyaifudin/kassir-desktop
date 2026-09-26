import { createHashRouter } from "react-router";
import { loginRoute } from "./pages/Login";
import { shopRoute } from "./pages/Shop";
import { productRoute } from "./pages/Product";
import { settingRoute } from "./pages/Setting";
import { recordRoute } from "./pages/Record";
import { moneyRoute } from "./pages/Money";
import { analRoute } from "./pages/Analytics";
import { cashierRoute } from "./pages/Cashier/index.tsx";
import { customerRoute } from "./pages/Customer/index.tsx";
import { methodRoute } from "./pages/Method/index.tsx";
import { socialRoute } from "./pages/Social/index.tsx";
import { authentication } from "./middleware/authenticate.ts";
import { lazy } from "react";
import { homeRoute } from "./pages/Home/index.ts";
import { debtRoute } from "./pages/Debt/index.tsx";
import { extraRoute } from "./pages/Extra/index.tsx";

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
          extraRoute,
          homeRoute,
          debtRoute,
          shopRoute,
          settingRoute,
          productRoute,
          moneyRoute,
          recordRoute,
          analRoute,
        ],
      },
    ],
  },
]);
