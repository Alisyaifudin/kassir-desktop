import { RouteObject } from "react-router";
import { route as itemRoute } from "./Record-Item";
import { lazy } from "react";

const Page = lazy(() => import("./Records"));

export const route: RouteObject = {
	path: "records",
	children: [
		{
			index: true,
			Component: Page,
		},
		itemRoute,
	],
};
