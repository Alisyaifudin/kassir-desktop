import { LoaderFunctionArgs, redirect, RouteObject, useLoaderData } from "react-router";
import { lazy, Suspense } from "react";
import { integer } from "~/lib/utils.ts";
import { Loading } from "./z-Loading";

const Page = lazy(() => import("./page.tsx"));

export const route: RouteObject = {
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
  const parsed = integer.safeParse(params.id);
  if (!parsed.success) {
    throw redirect("/stock?tab=extra");
  }
  const id = parsed.data;
  return id;
}

type Loader = typeof loader;
