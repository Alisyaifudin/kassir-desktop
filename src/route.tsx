import { createHashRouter } from "react-router";
import { lazy } from "react";
import { Effect } from "effect";
import { lazyEffect } from "./lib/lazy";
import { authMiddlewareEffect } from "./middleware/auth";
import { homeRouteEffect } from "./pages/Home/index.tsx";

const ErrorBoundary = lazy(() => import("./components/ErrorBoundary.tsx"));
const AuthLayout = lazy(() => import("./layouts/authenticated/index.tsx"));

export const routerEffect = Effect.gen(function* () {
  const RootLayout = yield* lazyEffect(() => import("./layouts/root.tsx"));
  const authMiddleware = yield* authMiddlewareEffect;
  const homeRoute = yield* homeRouteEffect;
  return createHashRouter([
    {
      path: "/",
      Component: RootLayout,
      ErrorBoundary,
      children: [
        {
          path: "/",
          Component: AuthLayout,
          middleware: [authMiddleware],
          children: [homeRoute],
        },
      ],
    },
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
