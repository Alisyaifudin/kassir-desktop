import { RouteObject } from "react-router";
import { route as newItemRoute } from "./New-Item";
import { route as productRoute } from "./Product";
import { lazy } from "react";

const Page = lazy(() => import("./Stock.tsx"));

export const route: RouteObject = {
	path: "stock",
	children: [
		{
			index: true,
			Component: Page,
		},
		newItemRoute,
		productRoute,
	],
};
