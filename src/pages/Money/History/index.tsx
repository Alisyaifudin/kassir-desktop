import { lazy, Suspense } from "react";
import { LoaderFunctionArgs, RouteObject, useLoaderData } from "react-router";
import { admin } from "~/middleware/admin";
import { Loading } from "./z-Loading";

const Page = lazy(() => import("./page"));

export const moneyDetailRoute: RouteObject = {
  Component: () => {
    const kindId = useLoaderData<typeof loader>();
    return (
      <Suspense fallback={<Loading />}>
        <Page kindId={kindId} />
      </Suspense>
    );
  },
  path: ":kindId",
  loader,
  middleware: [admin],
};

function loader({ params }: LoaderFunctionArgs) {
  return params.kindId!;
}
