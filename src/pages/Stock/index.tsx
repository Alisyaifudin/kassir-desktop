import { RouteObject } from "react-router";
import { route as newItemRoute } from "./new-item";
import { route as productRoute } from "./product";
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
		newItemRoute,
		productRoute,
	],
};
