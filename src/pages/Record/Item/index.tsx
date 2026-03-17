import { LoaderFunctionArgs, redirect, useLoaderData, type RouteObject } from "react-router";
import { lazy, Suspense } from "react";
import { Loading } from "./z-Loading";

const Page = lazy(() => import("./page"));

export const itemRoute: RouteObject = {
  path: ":timestamp",
  Component: () => {
    const timestamp = useLoaderData<Loader>();
    return (
      <Suspense fallback={<Loading />}>
        <Page timestamp={timestamp} />
      </Suspense>
    );
  },
  loader,
};

export async function loader({ params }: LoaderFunctionArgs) {
  const timestamp = params.timestamp;
  const num = Number(timestamp);
  if (isNaN(num) || !isFinite(num)) return redirect("/records");
  return num;
}

type Loader = typeof loader;
