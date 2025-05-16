import { RouteObject } from "react-router";
import { route as shopRoute } from "./Shop";
import { route as dataRoute } from "./Data";
import { route as cashierRoute } from "./Cashier";
import { route as profileRoute } from "./Profile";
import { route as socialRoute } from "./Social";
import { lazy } from "react";

const Page = lazy(() => import("./Setting"));

export const route: RouteObject = {
	path: "setting",
	children: [profileRoute, shopRoute, dataRoute, socialRoute, cashierRoute],
	Component: Page,
};
