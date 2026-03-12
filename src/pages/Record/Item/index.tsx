import { LoaderFunctionArgs, redirect, useLoaderData, type RouteObject } from "react-router";
import { lazy } from "react";

const Page = lazy(() => import("./page"));

export const route: RouteObject = {
  path: ":timestamp",
  Component: () => {
    const {fromTab, timestamp} = useLoaderData<Loader>();
    return <Page timestamp={timestamp} fromTab={fromTab} />;
  },
  loader,
};

export async function loader({ params, request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const timestamp = params.timestamp;
  const num = Number(timestamp);
  if (isNaN(num) || !isFinite(num)) return redirect("/records");
	const fromTab = getFromTab(url.searchParams)
  return {timestamp: num, fromTab};
}

type Loader = typeof loader;

function getFromTab(search: URLSearchParams) {
  const v = search.get("from-tab");
  if (v === null) return undefined;
  const num = Number(v);
  if (isNaN(num) || !isFinite(num)) return undefined;
  return num;
}
