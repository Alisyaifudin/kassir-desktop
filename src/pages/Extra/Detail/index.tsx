import { LoaderFunctionArgs, RouteObject, useLoaderData } from "react-router";
import { lazy, Suspense } from "react";
import { Loading } from "./z-Loading.tsx";

const Page = lazy(() => import("./page.tsx"));

export const extraDetailRoute: RouteObject = {
  Component: () => {
    const id = useLoaderData<typeof loader>();
    return (
      <Suspense fallback={<Loading />}>
        <Page id={id} />
      </Suspense>
    );
  },
  loader,
  path: ":id",
};

function loader({ params }: LoaderFunctionArgs) {
  return params.id!;
}
