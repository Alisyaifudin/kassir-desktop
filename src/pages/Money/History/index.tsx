import { Effect } from "effect";
import { Suspense } from "react";
import { RouteObject, useLoaderData } from "react-router";
import { lazyEffect } from "~/lib/lazy";
import { adminMiddlewareEffect } from "~/middleware/admin";
import { Loading } from "./z-Loading";
import type { LoaderFunctionArgs } from "react-router";

export const moneyDetailRouteEffect = Effect.gen(function* () {
  const Page = yield* lazyEffect(() => import("./page"));
  const adminMiddleware = yield* adminMiddlewareEffect;
  const route: RouteObject = {
    path: ":pocketId",
    loader({ params }: LoaderFunctionArgs) {
      return params.pocketId!;
    },
    middleware: [adminMiddleware],
    Component: () => {
      const pocketId = useLoaderData<string>();
      return (
        <Suspense fallback={<Loading />}>
          <Page pocketId={pocketId} />
        </Suspense>
      );
    },
  };
  return route;
});
