import { RouteObject } from "react-router";
import { route as profileRoute } from "./Profile";
import { route as dataRoute } from "./Data";
import { lazy, Suspense } from "react";

const Page = lazy(() => import("./Setting"));

export const route: RouteObject = {
	path: "setting",
	children: [profileRoute, dataRoute],
	Component: () => (
		<Suspense>
			<Page />
		</Suspense>
	),
};
