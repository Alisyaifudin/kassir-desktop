import { lazy, Suspense } from "react";
import { LoaderFunctionArgs, redirect, RouteObject, useLoaderData } from "react-router";
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
  const kindId = Number(params.kindId!);
  if (isNaN(kindId) || !isFinite(kindId)) throw redirect("/money");
  return kindId;
}
