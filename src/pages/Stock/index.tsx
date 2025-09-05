import { RouteObject } from "react-router";
import { route as newProductRoute } from "./New-Product/index.tsx";
import { route as productRoute } from "./product";
import { route as newAdditionalRoute } from "./New-Additional/index.tsx";
import { route as additionalRoute } from "./Additional";
import { lazy } from "react";
import { useDB } from "~/hooks/use-db";

const Page = lazy(() => import("./Stock.tsx"));

export const route: RouteObject = {
	path: "stock",
	children: [
		{
			index: true,
			Component: () => {
				const db = useDB();
				return <Page db={db} />;
			},
		},
		newProductRoute,
		productRoute,
		newAdditionalRoute,
		additionalRoute,
	],
};
