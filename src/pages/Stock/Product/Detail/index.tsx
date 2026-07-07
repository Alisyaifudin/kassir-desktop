import { LoaderFunctionArgs, RouteObject } from "react-router";
import { lazy, Suspense } from "react";
import { imageRouteEffect } from "./Image";
import { productInfoRouteEffect } from "./Info";
import { perfRouteEffect } from "./Performance";
import { Loading } from "./z-Loading";
import { Effect } from "effect";

const Page = lazy(() => import("./page"));

export const productRouteEffect = Effect.gen(function* () {
  const infoRoute = yield* productInfoRouteEffect;
  const imageRoute = yield* imageRouteEffect;
  const perfRoute = yield* perfRouteEffect;
  const productRoute: RouteObject = {
    path: "product/:id",
    Component: () => (
      <Suspense fallback={<Loading />}>
        <Page />
      </Suspense>
    ),
    loader: ({ params }: LoaderFunctionArgs) => {
      const id = params.id as string;
      return id;
    },
    children: [imageRoute, infoRoute, perfRoute],
  };
  return productRoute;
});
