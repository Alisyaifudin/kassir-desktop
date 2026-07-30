import { lazy, Suspense } from "react";
import { redirect, RouteObject, useLoaderData } from "react-router";
import { Loading } from "./z-Loading";
import { Effect } from "effect";
import { authMiddlewareEffect } from "~/middleware/auth";
import { TransactionService } from "~/services/transaction";
import { lazyEffect } from "~/lib/lazy";

export const shopRouteEffect = Effect.gen(function* () {
  const authMiddleware = yield* authMiddlewareEffect;
  const txService = yield* TransactionService;
  const Page = yield* lazyEffect(() => import("./page"));
  const shopRoute: RouteObject = {
    path: "shop",
    middleware: [authMiddleware],
    children: [
      {
        index: true,
        loader: async () => {
          const tab = await txService.getTab();
          throw redirect(`/shop/${tab}`);
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
