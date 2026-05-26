import { LoaderFunctionArgs, RouteObject, useLoaderData } from "react-router";
import { lazy, Suspense } from "react";
import { Loading } from "./z-Loading";

const Page = lazy(() => import("./page.tsx"));

export const extraRoute: RouteObject = {
  Component: () => {
    const id = useLoaderData<Loader>();
    return (
      <Suspense fallback={<Loading />}>
        <Page id={id} />
      </Suspense>
    );
  },
  loader,
  path: "extra/:id",
};

async function loader({ params }: LoaderFunctionArgs) {
  const id = params.id!;
  return id;
}

type Loader = typeof loader;
