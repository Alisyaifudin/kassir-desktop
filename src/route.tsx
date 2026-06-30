import { createHashRouter } from "react-router";
import { lazy } from "react";
import { Effect } from "effect";
import { lazyEffect } from "./lib/lazy";
import { authMiddlewareEffect } from "./middleware/auth";
import { homeRouteEffect } from "./pages/Home/index.tsx";
import { loginRouteEffect } from "./pages/Login/index.tsx";
import { settingRouteEffect } from "./pages/Setting/index.tsx";

const ErrorBoundary = lazy(() => import("./components/ErrorBoundary.tsx"));

export const routerEffect = Effect.gen(function* () {
  const AuthLayout = yield* lazyEffect(() => import("./layouts/index.tsx"));
  const authMiddleware = yield* authMiddlewareEffect;
  const homeRoute = yield* homeRouteEffect;
  const loginRoute = yield* loginRouteEffect;
  const settingRoute = yield* settingRouteEffect;
  return createHashRouter([
    {
      path: "/",
      Component: AuthLayout,
      ErrorBoundary,
      middleware: [authMiddleware],
      children: [homeRoute, settingRoute],
    },
    loginRoute,
  ]);
});

// export const router = createHashRouter([
//   {
//     path: "/",
//     ErrorBoundary,
//     Component: RootLayout,
//     children: [
//       loginRoute,
//       {
//         path: "/",
//         middleware: [authentication],
//         Component: AuthLayout,
//         children: [
//           cashierRoute,
//           customerRoute,
//           methodRoute,
//           socialRoute,
//           homeRoute,
//           shopRoute,
//           settingRoute,
//           stockRoute,
//           moneyRoute,
//           recordRoute,
//           analRoute,
//         ],
//       },
//     ],
//   },
// ]);
