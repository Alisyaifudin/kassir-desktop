import { lazy, Suspense } from "react";
import { RouteObject, useLoaderData } from "react-router";
import { Loading } from "./z-Loading";
import Redirect from "~/components/Redirect";
import { Effect } from "effect";
import { authMiddlewareEffect } from "~/middleware/auth";
import { TransactionService } from "~/services/transaction";
import { lazyEffect } from "~/lib/lazy";

export const shopRouteEffect = Effect.gen(function* () {
  const authMiddleware = yield* authMiddlewareEffect;
  const txService = yield* TransactionService;
  const Layout = yield* lazyEffect(() => import("./layout"));
  const Page = yield* lazyEffect(() => import("./page"));
  const shopRoute: RouteObject = {
    path: "shop",
    middleware: [authMiddleware],
    Component: () => (
      <Suspense fallback={<Loading />}>
        <Layout />
      </Suspense>
    ),
    children: [
      {
        index: true,
        Component: () => {
          const tab = txService.useTab();
          return <Redirect to={`/shop/${tab.id}`} />;
        },
      },
      {
        path: ":id",
        loader: ({ params }) => {
          const id = params.id;
          return id;
        },
        Component: () => {
          const id = useLoaderData<string>();
          return (
            <Suspense fallback={<Loading />}>
              <Page id={id} />
            </Suspense>
          );
        },
        ErrorBoundary: lazy(() => import("./z-RedirectErrorBoundary")),
      },
    ],
  };
  return shopRoute;
});
