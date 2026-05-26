import { LoaderFunctionArgs, useLoaderData, type RouteObject } from "react-router";
import { lazy, Suspense } from "react";
import { Loading } from "./z-Loading";

const Page = lazy(() => import("./page"));

export const itemRoute: RouteObject = {
  path: ":recordId",
  Component: () => {
    const recordId = useLoaderData<Loader>();
    return (
      <Suspense fallback={<Loading />}>
        <Page recordId={recordId} />
      </Suspense>
    );
  },
  loader,
};

export async function loader({ params }: LoaderFunctionArgs) {
  return params.recordId!;
}

type Loader = typeof loader;
