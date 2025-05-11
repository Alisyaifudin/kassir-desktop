import { RouteObject } from "react-router";
import { route as itemRoute } from "./Record-Item";
import { lazy, Suspense } from "react";
import { Loading } from "~/components/Loading";

const Page = lazy(() => import("./Records"));

export const route: RouteObject = {
	path: "records",
	children: [
		{
			index: true,
			Component: () => (
				<Suspense fallback={<Loading />}>
					<Page />
				</Suspense>
			),
		},
		itemRoute,
	],
};
