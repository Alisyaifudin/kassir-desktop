import { RouteObject } from "react-router";
import { route as newItemRoute } from "./New-Item";
import { route as productRoute } from "./Product";
import { lazy, Suspense } from "react";
import { Loading } from "~/components/Loading.tsx";

const Page = lazy(() => import("./Stock.tsx"));

export const route: RouteObject = {
	path: "stock",
	children: [
		{
			index: true,
			Component: () => (
				<Suspense fallback={<Loading />}>
					<Page />
				</Suspense>
			),
		},
		newItemRoute,
		productRoute,
	],
};
