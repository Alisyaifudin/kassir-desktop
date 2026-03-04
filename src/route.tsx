import { createBrowserRouter } from "react-router";
import { route as loginRoute } from "./pages/login";
import { route as shopRoute } from "./pages/shop";
import { route as stockRoute } from "./pages/stock";
import { route as settingRoute } from "./pages/setting";
import { route as recordsRoute } from "./pages/Record/index.tsx";
import { route as moneyRoute } from "./pages/money";
import { route as analRoute } from "./pages/analytics";
import { authentication } from "./middleware/authenticate.ts";
import { lazy } from "react";

const RootLayout = lazy(() => import("./layouts/root"));
const ErrorBoundary = lazy(() => import("./components/ErrorBoundary.tsx"));
const AuthLayout = lazy(() => import("./layouts/authenticated"));

export const router = createBrowserRouter([
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
        children: [shopRoute, settingRoute, stockRoute, moneyRoute, recordsRoute, analRoute],
      },
    ],
  },
]);
