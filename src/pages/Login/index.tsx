import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { Loading } from "~/components/Loading";

const Page = lazy(() => import("./Login"));

export const route: RouteObject = {
	path: "login",
	Component: () => (
		<Suspense fallback={<Loading />}>
			<Page />
		</Suspense>
	),
};
