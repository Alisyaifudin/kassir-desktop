import { lazy, Suspense } from "react";
import { LoaderFunctionArgs, RouteObject, useLoaderData } from "react-router";
import { TableLoading } from "../z-Loading";

const Page = lazy(() => import("./page"));

export const moneyHistoryRoute: RouteObject = {
  path: ":pocketId",
  Component: () => {
    const pocketId = useLoaderData<typeof loader>();
    return (
      <Suspense fallback={<TableLoading />}>
        <Page pocketId={pocketId} />
      </Suspense>
    );
  },
  loader,
};

function loader({ params }: LoaderFunctionArgs) {
  return params.pocketId!;
}
