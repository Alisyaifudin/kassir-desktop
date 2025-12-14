import { RouteObject } from "react-router";
import { route as itemRoute } from "./Record-Item";
// import { route as searchRoute } from "./search-record-by-no";
import { lazy } from "react";
import { loader } from "./loader";
import { action } from "./action";

const Page = lazy(() => import("./page"));

export const route: RouteObject = {
	path: "records",
	children: [
		{
			loader,
			action,
			Component: Page,
			index: true,
		},
		itemRoute,
		// searchRoute,
	],
};
