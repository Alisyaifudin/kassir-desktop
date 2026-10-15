import { LoaderFunctionArgs, useLoaderData, type RouteObject } from "react-router";
import { lazy, Suspense } from "react";
import { Loading } from "./z-Loading";

const Page = lazy(() => import("./page"));

/**
 * One record, in full: the receipt it prints and the ledger behind it. Mounted at
 * `/records/:recordId`, which the records pane, the comprehensive search, the debt
 * table and the analytics tables all link to.
 */
export const itemRoute: RouteObject = {
  path: ":recordId",
  Component: () => {
    const recordId = useLoaderData<typeof loader>();
    return (
      <Suspense fallback={<Loading />}>
        <Page recordId={recordId} />
      </Suspense>
    );
  },
  loader,
};

export function loader({ params }: LoaderFunctionArgs) {
  return params.recordId!;
}
