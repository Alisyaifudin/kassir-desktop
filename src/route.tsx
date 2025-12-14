import { createBrowserRouter } from "react-router";
import { route as loginRoute } from "./pages/login";
import { route as shopRoute } from "./pages/shop";
import { route as stockRoute } from "./pages/stock";
import { route as settingRoute } from "./pages/setting";
import { route as recordsRoute } from "./pages/Record/index.tsx";
import { route as moneyRoute } from "./pages/money";
// import { route as analRoute } from "./pages/analytics";
import AuthLayout, { loader } from "./layouts/authenticated";
import RootLayout, { ErrorBoundary, loader as rootLoader } from "./layouts/root";
import { authentication } from "./middleware/authenticate.ts";

export const router = createBrowserRouter([
  {
    path: "/",
    ErrorBoundary,
    Component: RootLayout,
    loader: rootLoader,
    children: [
      loginRoute,
      {
        path: "/",
        middleware: [authentication],
        Component: AuthLayout,
        loader,
        // children: [shopRoute, settingRoute, stockRoute, recordsRoute, analRoute, moneyRoute],
        // children: [shopRoute, settingRoute, moneyRoute, stockRoute, recordsRoute],
        children: [shopRoute],
      },
    ],
  },
]);
