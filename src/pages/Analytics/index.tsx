import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { Loading } from "~/components/Loading";

const Page = lazy(() => import("./Analytics"));

export const route: RouteObject = {
	path: "analytics",
	Component: () => (
		<Suspense fallback={<Loading />}>
			<Page />
		</Suspense>
	),
};
