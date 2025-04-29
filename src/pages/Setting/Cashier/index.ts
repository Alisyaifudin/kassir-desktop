import { lazy } from "react";
import { RouteObject } from "react-router";

const Page = lazy(() => import("./Cashier"));

export const route: RouteObject = {
	Component: Page,
	path: "cashier"
};
