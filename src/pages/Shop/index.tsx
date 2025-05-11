import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { Loading } from "~/components/Loading";

const Page = lazy(() => import("./Shop"));

export const route: RouteObject = {
	index: true,
	Component: () => (
		<Suspense fallback={<Loading />}>
			<Page />
		</Suspense>
	),
};
