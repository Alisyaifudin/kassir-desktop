import { LoaderFunctionArgs, redirect, RouteObject, useLoaderData } from "react-router";
import { lazy } from "react";
import { integer } from "~/lib/utils.ts";

const Page = lazy(() => import("./page.tsx"));

export const route: RouteObject = {
  Component: () => {
    const id = useLoaderData<Loader>();
    return <Page id={id} />;
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
