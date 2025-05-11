import { RouteObject } from "react-router";
import { route as shopRoute } from "./Shop";
import { route as dataRoute } from "./Data";
import { route as cashierRoute } from "./Cashier";
import { route as profileRoute } from "./Profile";
import { lazy } from "react";

const Page = lazy(() => import("./Setting"));

export const route: RouteObject = {
	path: "setting",
	children: [profileRoute, shopRoute, dataRoute, cashierRoute],
	Component: Page,
};
