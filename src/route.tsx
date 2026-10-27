import { createHashRouter } from "react-router";
import { loginRoute } from "./pages/Login";
import { posRoute } from "./pages/Pos/index.tsx";
import { restockRoute } from "./pages/Restock/index.tsx";
import { productRoute } from "./pages/Product";
import { settingRoute } from "./pages/Setting";
import { recordRoute } from "./pages/Record";
import { moneyRoute } from "./pages/Money";
import { cashierRoute } from "./pages/Cashier/index.tsx";
import { customerRoute } from "./pages/Customer/index.tsx";
import { methodRoute } from "./pages/Method/index.tsx";
import { socialRoute } from "./pages/Social/index.tsx";
import { homeRoute } from "./pages/Home/index.ts";
import { debtRoute } from "./pages/Debt/index.tsx";
import { extraRoute } from "./pages/Extra/index.tsx";
import { transactionRoute } from "./pages/Transaction/index.tsx";
import { analyticsRoute } from "./pages/Analytics/index.tsx";
import { devPageDataRoute } from "./pages/Dev/PageData/index.tsx";
import { devPageCacheRoute } from "./pages/Dev/PageCache/index.tsx";

import ErrorBoundary from "./components/ErrorBoundary.tsx";
import AuthLayout from "./layouts/authenticated";

export const router = createHashRouter([
  {
    path: "/",
    ErrorBoundary,
    children: [
      loginRoute,
      {
        path: "/",
        Component: AuthLayout,
        children: [
          cashierRoute,
          customerRoute,
          methodRoute,
          socialRoute,
          extraRoute,
          transactionRoute,
          analyticsRoute,
          homeRoute,
          debtRoute,
          posRoute,
          restockRoute,
          settingRoute,
          productRoute,
          moneyRoute,
          recordRoute,
          // The page-data pattern's playground; the route only exists in a DEV
          // build. See `~/components/page-data` and `src/pages/Dev/PageData`.
          ...(import.meta.env.DEV ? [devPageDataRoute, devPageCacheRoute] : []),
        ],
      },
    ],
  },
]);
