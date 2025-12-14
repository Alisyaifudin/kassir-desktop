import { RouteObject } from "react-router";
import { route as newProductRoute } from "./New-Product/index.tsx";
import { route as productRoute } from "./product";
import { route as newAdditionalRoute } from "./New-Additional/index.tsx";
import { route as additionalRoute } from "./Additional";
import { lazy } from "react";
import { loader } from "./loader.ts";

const Page = lazy(() => import("./page.tsx"));

export const route: RouteObject = {
	path: "stock",
	children: [
		{
			index: true,
			Component: Page,
			loader,
		},
		newProductRoute,
		productRoute,
		newAdditionalRoute,
		additionalRoute,
	],
};
