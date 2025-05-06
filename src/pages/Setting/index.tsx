import { RouteObject } from "react-router";
import { route as shopRoute } from "./Shop/index";
import { route as dataRoute } from "./Data/index";
import { route as cashierRoute } from "./Cashier/index";
import { route as profileRoute } from "./Profile/index";
import { lazy, Suspense } from "react";

const Page = lazy(() => import("./Setting"));

export const route: RouteObject = {
	path: "setting",
	children: [profileRoute, shopRoute, dataRoute, cashierRoute],
	Component: () => (
		<Suspense>
			<Page />
		</Suspense>
	),
};
