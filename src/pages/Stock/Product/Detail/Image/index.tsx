import { Effect } from "effect";
import { Suspense } from "react";
import { lazyEffect } from "~/lib/lazy";
import { Loading } from "./z-Loading";

export const imageRouteEffect = Effect.gen(function* () {
  const Page = yield* lazyEffect(() => import("./page"));
  return {
    Component: () => (
      <Suspense fallback={<Loading />}>
        <Page />
      </Suspense>
    ),
    path: "images",
  };
});
