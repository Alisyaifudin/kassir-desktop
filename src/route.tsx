import { createHashRouter } from "react-router";
import { lazy } from "react";
import { Effect } from "effect";
import { lazyEffect } from "./lib/lazy";
import { authMiddlewareEffect } from "./middleware/auth";
import { homeRouteEffect } from "./pages/Home/index.tsx";
import { loginRouteEffect } from "./pages/Login/index.tsx";
import { settingRouteEffect } from "./pages/Setting/index.tsx";
import { cashierRouteEffect } from "./pages/Cashier/index.tsx";
import { customerRouteEffect } from "./pages/Customer/index.tsx";
import { socialRouteEffect } from "./pages/Social/index.tsx";

const ErrorBoundary = lazy(() => import("./components/ErrorBoundary.tsx"));

export const routerEffect = Effect.gen(function* () {
  const AuthLayout = yield* lazyEffect(() => import("./layouts/index.tsx"));
  const authMiddleware = yield* authMiddlewareEffect;
  const homeRoute = yield* homeRouteEffect;
  const loginRoute = yield* loginRouteEffect;
  const settingRoute = yield* settingRouteEffect;
  const cashierRoute = yield* cashierRouteEffect;
  const customerRoute = yield* customerRouteEffect;
  const socialRoute = yield* socialRouteEffect;
  return createHashRouter([
    {
      path: "/",
      Component: AuthLayout,
      ErrorBoundary,
      middleware: [authMiddleware],
      children: [homeRoute, settingRoute, cashierRoute, customerRoute, socialRoute],
    },
    loginRoute,
  ]);
});
