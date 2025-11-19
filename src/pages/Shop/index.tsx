import { lazy } from "react";
import { RouteObject } from "react-router";

const Page = lazy(() => import("./page"));

export const route: RouteObject = {
	index: true,
	Component: () => {
		return <Page  />;
	},
};
